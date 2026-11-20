"""Calibrate and evaluate the open-set gate (src/inference/open_set.py) on labelled REAL photos.

    python scripts/evaluation/calibrate_open_set.py \
        --labelled-dir <dir with _manifest.json>   # e.g. downloaded Commons photos (see docs)
        [--co3d-dir data/raw/co3d_research_only]   # optional extra supported real photos
        [--write-config]                           # update configs/open_set_gate.json

Protocol
- Every image gets a label: one of the 7 supported categories, an *in-vocabulary* unsupported
  label (object that has its own unsupported prompt, e.g. backpack) or a *held-out* unsupported
  class that has NO prompt (stapler, scissors, teddy bear, basketball). Held-out classes are never
  used for fitting; they measure true open-set behaviour.
- Deterministic split by image sha256: 60% calibration, 40% test.
- Candidate scores compared before choosing (reported, not assumed):
    MSP (max softmax probability with fitted temperature), energy (T·logsumexp(cos/T) over
    supported labels), raw max cosine, and the full rule in ``open_set.decide``.
- Temperature: minimises NLL of the true label over (supported + in-vocab unsupported) calib images.
- Thresholds (min_prob, min_margin, unsupported_min_prob): grid search on calibration data,
  maximising correct-SUPPORTED rate subject to unsupported→SUPPORTED <= 5%, wrong-category
  SUPPORTED <= 3% and supported→UNSUPPORTED_ITEM (hard stop) <= 1%. Precision is preferred over coverage: an uncertain photo still gets searched,
  it just never auto-matches.
- Robustness probes on the TEST split: Gaussian blur (r=6), 2-object collages, centre 40% crops.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from src.inference import open_set as OS  # noqa: E402

SUPPORTED = list(OS.SUPPORTED_PROMPTS)
CLASS_TO_LABEL = {**{c: c for c in SUPPORTED}, "backpack": "backpack", "water_bottle": "water_bottle",
                  "umbrella": "umbrella", "mug": "mug", "sneaker": "shoe", "sunglasses": "sunglasses"}
HELD_OUT = {"stapler", "scissors", "teddy_bear", "basketball"}
CO3D_MAP = {"laptop": "laptop", "cellphone": "mobile_phone", "book": "book"}


def split_of(sha: str) -> str:
    return "calib" if int(sha[:8], 16) % 10 < 6 else "test"


def load_items(labelled_dir: Path | None, co3d_dir: Path | None, co3d_per_seq: int) -> list[dict]:
    items = []
    if labelled_dir:
        for m in json.loads((labelled_dir / "_manifest.json").read_text()):
            if m.get("exclude"):
                continue
            cls = m["class"]
            label = CLASS_TO_LABEL.get(cls, None)
            kind = "supported" if label in SUPPORTED else ("held_out_unsupported" if cls in HELD_OUT else "unsupported")
            items.append({"path": str(labelled_dir / m["file"]), "class": cls, "label": label, "kind": kind,
                          "source": m.get("source", "wikimedia_commons"), "sha256": m["sha256"]})
    if co3d_dir and co3d_dir.exists():
        for cat, label in CO3D_MAP.items():
            for seq in sorted((co3d_dir / cat).iterdir()) if (co3d_dir / cat).exists() else []:
                imgs = sorted((seq / "images").glob("*.jpg"))
                for img in imgs[len(imgs) // 3:: max(1, len(imgs) // (co3d_per_seq + 1))][:co3d_per_seq]:
                    sha = hashlib.sha256(f"{seq.name}".encode()).hexdigest()  # split by sequence
                    items.append({"path": str(img), "class": cat, "label": label, "kind": "supported",
                                  "source": "co3d_research_only", "sha256": sha})
    for it in items:
        it["split"] = split_of(it["sha256"])
    return items


def collage(a: Image.Image, b: Image.Image) -> Image.Image:
    a, b = a.resize((320, 320)), b.resize((320, 320))
    out = Image.new("RGB", (640, 320))
    out.paste(a, (0, 0)); out.paste(b, (320, 0))
    return out


def centre_crop(im: Image.Image, frac=0.4) -> Image.Image:
    w, h = im.size
    cw, ch = int(w * frac), int(h * frac)
    return im.crop(((w - cw) // 2, (h - ch) // 2, (w + cw) // 2, (h + ch) // 2))


def nll(cos: np.ndarray, y: np.ndarray, t: float) -> float:
    z = cos / t
    z = z - z.max(1, keepdims=True)
    logp = z - np.log(np.exp(z).sum(1, keepdims=True))
    return float(-logp[np.arange(len(y)), y].mean())


def auroc(pos: np.ndarray, neg: np.ndarray) -> float:
    """P(score_pos > score_neg), ties count half."""
    if len(pos) == 0 or len(neg) == 0:
        return float("nan")
    allv = np.concatenate([pos, neg])
    ranks = allv.argsort().argsort().astype(float) + 1
    # average ranks for ties
    _, inv, counts = np.unique(allv, return_inverse=True, return_counts=True)
    sums = np.zeros(len(counts)); np.add.at(sums, inv, ranks)
    ranks = (sums / counts)[inv]
    return float((ranks[: len(pos)].sum() - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg)))


def evaluate(rows: list[dict], names: list[str], cos: np.ndarray, cfg: OS.GateConfig) -> dict:
    out = {"n": len(rows)}
    dec = [OS.decide(names, c, cfg) for c in cos]
    sup = [i for i, r in enumerate(rows) if r["kind"] == "supported"]
    uns = [i for i, r in enumerate(rows) if r["kind"] != "supported"]
    ho = [i for i, r in enumerate(rows) if r["kind"] == "held_out_unsupported"]

    def rate(idx, pred):
        return round(sum(1 for i in idx if pred(i)) / len(idx), 4) if idx else None

    out["supported_n"] = len(sup)
    out["supported_correct_SUPPORTED"] = rate(sup, lambda i: dec[i]["decision"] == OS.SUPPORTED and dec[i]["category"] == rows[i]["label"])
    out["supported_wrong_category_SUPPORTED"] = rate(sup, lambda i: dec[i]["decision"] == OS.SUPPORTED and dec[i]["category"] != rows[i]["label"])
    out["supported_UNCERTAIN"] = rate(sup, lambda i: dec[i]["decision"] == OS.UNCERTAIN)
    out["supported_rejected_UNSUPPORTED"] = rate(sup, lambda i: dec[i]["decision"] == OS.UNSUPPORTED_ITEM)
    out["supported_top1_category_accuracy"] = rate(sup, lambda i: dec[i]["candidate_category"] == rows[i]["label"])
    out["unsupported_n"] = len(uns)
    out["unsupported_accepted_as_SUPPORTED"] = rate(uns, lambda i: dec[i]["decision"] == OS.SUPPORTED)
    out["unsupported_UNCERTAIN"] = rate(uns, lambda i: dec[i]["decision"] == OS.UNCERTAIN)
    out["unsupported_rejected"] = rate(uns, lambda i: dec[i]["decision"] == OS.UNSUPPORTED_ITEM)
    out["held_out_n"] = len(ho)
    out["held_out_accepted_as_SUPPORTED"] = rate(ho, lambda i: dec[i]["decision"] == OS.SUPPORTED)
    out["held_out_rejected"] = rate(ho, lambda i: dec[i]["decision"] == OS.UNSUPPORTED_ITEM)
    acc = [i for i in range(len(rows)) if dec[i]["decision"] == OS.SUPPORTED]
    out["precision_of_SUPPORTED"] = rate(acc, lambda i: rows[i]["kind"] == "supported" and dec[i]["category"] == rows[i]["label"])
    by_cls = {}
    for i, r in enumerate(rows):
        b = by_cls.setdefault(r["class"], {"n": 0, "SUPPORTED_correct": 0, "UNCERTAIN": 0, "UNSUPPORTED_ITEM": 0, "SUPPORTED_wrong": 0})
        b["n"] += 1
        d = dec[i]["decision"]
        if d == OS.SUPPORTED:
            b["SUPPORTED_correct" if dec[i]["category"] == r["label"] else "SUPPORTED_wrong"] += 1
        else:
            b[d] += 1
    out["per_class"] = by_cls
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--labelled-dir", type=Path, required=True)
    ap.add_argument("--co3d-dir", type=Path, default=ROOT / "data/raw/co3d_research_only")
    ap.add_argument("--co3d-per-seq", type=int, default=1)
    ap.add_argument("--out", type=Path, default=ROOT / "reports/calibration/open_set_gate_calibration.json")
    ap.add_argument("--cache", type=Path, default=ROOT / "data/interim/calibration_cache/open_set_features.npz")
    ap.add_argument("--write-config", action="store_true")
    args = ap.parse_args()

    items = load_items(args.labelled_dir, args.co3d_dir, args.co3d_per_seq)
    print(f"{len(items)} labelled images", {k: sum(1 for i in items if i['kind'] == k) for k in
                                            ('supported', 'unsupported', 'held_out_unsupported')}, flush=True)
    from run_inference import LiveModels
    os.chdir(ROOT)
    t0 = time.time()
    models = LiveModels(device="cpu")
    print(f"models loaded in {time.time()-t0:.0f}s", flush=True)
    names_full = models.gate_labels

    def feats(im):
        e = models.embed_siglip_image(im.convert("RGB"))
        names, cos = OS.label_cosines(models.gate_cosines(e), names_full)
        return names, cos

    names = None
    cos = []
    t0 = time.time()
    for it in items:
        names, c = feats(Image.open(it["path"]))
        cos.append(c)
    cos = np.stack(cos)
    print(f"embedded {len(items)} images in {time.time()-t0:.0f}s", flush=True)
    args.cache.parent.mkdir(parents=True, exist_ok=True)
    np.savez(args.cache, cos=cos, names=np.array(names))

    calib = [i for i, it in enumerate(items) if it["split"] == "calib"]
    test = [i for i, it in enumerate(items) if it["split"] == "test"]

    # ---------------- temperature (fit on labelled, in-vocabulary calib images only)
    fit = [i for i in calib if items[i]["label"] is not None]
    y = np.array([names.index(items[i]["label"]) for i in fit])
    temps = np.geomspace(0.002, 0.2, 120)
    losses = [nll(cos[fit], y, t) for t in temps]
    T = float(temps[int(np.argmin(losses))])
    print(f"fitted temperature T={T:.4f} (NLL {min(losses):.3f}); old pipeline used softmax(cos*10) i.e. T=0.1 "
          f"(NLL {nll(cos[fit], y, 0.1):.3f})", flush=True)

    # ---------------- compare candidate OOD scores (supported vs all unsupported) on calib
    sup_idx = [names.index(c) for c in SUPPORTED]

    def scores(idx):
        c = cos[idx]
        z = c / T
        p_all = np.exp(z - z.max(1, keepdims=True)); p_all /= p_all.sum(1, keepdims=True)
        msp = p_all[:, sup_idx].max(1)
        energy = T * np.log(np.exp(c[:, sup_idx] / T).sum(1))
        maxcos = c[:, sup_idx].max(1)
        sup_mass = p_all[:, sup_idx].sum(1)
        return {"msp_full_softmax": msp, "energy_supported": energy, "max_cosine": maxcos,
                "supported_mass": sup_mass}

    def ood_table(idx):
        s = scores(idx)
        pos = np.array([items[i]["kind"] == "supported" for i in idx])
        return {k: round(auroc(v[pos], v[~pos]), 4) for k, v in s.items()}

    score_cmp = {"calib": ood_table(calib), "test": ood_table(test),
                 "test_held_out_only": ood_table([i for i in test if items[i]["kind"] != "unsupported"])}
    print("AUROC supported-vs-unsupported:", json.dumps(score_cmp), flush=True)

    # ---------------- thresholds
    calib_rows = [items[i] for i in calib]
    best = None
    grid = []
    for mp in np.arange(0.30, 0.96, 0.05):
        for mm in (0.05, 0.1, 0.2, 0.3):  # floor: a near-tie between two categories is never confident
            for um in (0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9):
                cfg = OS.GateConfig(temperature=T, min_prob=float(mp), min_margin=mm, unsupported_min_prob=um)
                r = evaluate(calib_rows, names, cos[calib], cfg)
                # UNSUPPORTED_ITEM is a hard stop (no search at all), UNCERTAIN still searches but never
                # auto-matches. A supported item wrongly hard-stopped is the costlier error → cap it at 1%.
                ok = ((r["unsupported_accepted_as_SUPPORTED"] or 0) <= 0.05
                      and (r["supported_wrong_category_SUPPORTED"] or 0) <= 0.03
                      and (r["supported_rejected_UNSUPPORTED"] or 0) <= 0.01)
                key = (ok, r["supported_correct_SUPPORTED"] or 0, r["unsupported_rejected"] or 0)
                grid.append((key, cfg))
                if best is None or key > best[0]:
                    best = (key, cfg)
    cfg = best[1]
    print(f"chosen: T={cfg.temperature:.4f} min_prob={cfg.min_prob:.2f} min_margin={cfg.min_margin} "
          f"unsupported_min_prob={cfg.unsupported_min_prob} (constraints met: {best[0][0]})", flush=True)

    result = {
        "date": time.strftime("%Y-%m-%d"),
        "data": {"n_images": len(items), "calib": len(calib), "test": len(test),
                 "by_source": {s: sum(1 for i in items if i["source"] == s) for s in {i["source"] for i in items}},
                 "classes": sorted({i["class"] for i in items}), "held_out_classes": sorted(HELD_OUT),
                 "split_rule": "sha256 (Commons) / sequence name (CO3D) -> 60% calib / 40% test"},
        "temperature": {"fitted": T, "previous_pipeline_equivalent": 0.1,
                        "nll_fitted": round(min(losses), 4), "nll_previous": round(nll(cos[fit], y, 0.1), 4)},
        "ood_score_auroc": score_cmp,
        "chosen_config": {k: v for k, v in cfg.to_dict().items() if k not in ("provenance", "metrics")},
        "calib_metrics": evaluate(calib_rows, names, cos[calib], cfg),
        "test_metrics": evaluate([items[i] for i in test], names, cos[test], cfg),
        "test_metrics_by_source": {},
    }
    for src in {i["source"] for i in items}:
        idx = [i for i in test if items[i]["source"] == src]
        if idx:
            result["test_metrics_by_source"][src] = evaluate([items[i] for i in idx], names, cos[idx], cfg)

    # ---------------- robustness probes on the test split
    rng = np.random.default_rng(0)
    test_sup = [i for i in test if items[i]["kind"] == "supported" and items[i]["source"] != "co3d_research_only"]
    probes = {"gaussian_blur_r6": [], "centre_crop_40pct": [], "two_object_collage": []}
    for i in test_sup:
        im = Image.open(items[i]["path"]).convert("RGB")
        probes["gaussian_blur_r6"].append(OS.decide(*feats(im.filter(ImageFilter.GaussianBlur(6))), cfg))
        probes["centre_crop_40pct"].append(OS.decide(*feats(centre_crop(im)), cfg))
        other = [j for j in test_sup if items[j]["label"] != items[i]["label"]]
        j = other[int(rng.integers(len(other)))]
        probes["two_object_collage"].append(OS.decide(*feats(collage(im, Image.open(items[j]["path"]).convert("RGB"))), cfg))
    result["robustness_test_split"] = {}
    for k, decs in probes.items():
        n = len(decs)
        result["robustness_test_split"][k] = {
            "n": n,
            "SUPPORTED": round(sum(d["decision"] == OS.SUPPORTED for d in decs) / n, 4),
            "UNCERTAIN": round(sum(d["decision"] == OS.UNCERTAIN for d in decs) / n, 4),
            "UNSUPPORTED_ITEM": round(sum(d["decision"] == OS.UNSUPPORTED_ITEM for d in decs) / n, 4),
        }
    blank = [Image.new("RGB", (480, 360), c) for c in ((0, 0, 0), (255, 255, 255), (128, 128, 128))]
    noise = [Image.fromarray(rng.integers(0, 255, (360, 480, 3), dtype=np.uint8)) for _ in range(3)]
    result["robustness_test_split"]["blank_and_noise_images"] = [OS.decide(*feats(im), cfg)["decision"] for im in blank + noise]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=1))
    print(json.dumps({k: result[k] for k in ("temperature", "chosen_config", "test_metrics_by_source", "robustness_test_split")}, indent=1, default=str))
    if args.write_config:
        t = result["test_metrics"]
        cfg.provenance = (f"calibrated {result['date']} by scripts/evaluation/calibrate_open_set.py on "
                          f"{len(calib)} calib / {len(test)} test real photos (Wikimedia Commons + CO3D); "
                          f"see reports/calibration/open_set_gate_calibration.json")
        cfg.metrics = {"test_supported_correct_SUPPORTED": t["supported_correct_SUPPORTED"],
                       "test_unsupported_accepted_as_SUPPORTED": t["unsupported_accepted_as_SUPPORTED"],
                       "test_held_out_accepted_as_SUPPORTED": t["held_out_accepted_as_SUPPORTED"],
                       "test_precision_of_SUPPORTED": t["precision_of_SUPPORTED"]}
        path = ROOT / "configs" / "open_set_gate.json"
        path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps(cfg.to_dict(), indent=1) + "\n")
        print("wrote", path)


if __name__ == "__main__":
    main()
