"""Calibrate the auto-match threshold on positive and hard-negative pairs (prefers precision).

    python scripts/evaluation/calibrate_match_threshold.py [--co3d-dir data/raw/co3d_research_only]
                                                           [--write-config]

Data: CO3D (research-only licence, never committed). One physical object per sequence.
- gallery item  = an early frame of the sequence (what the finder photographed)
- query         = later frames of the SAME object (what the owner photographs), and the same frames
                  with a phone-camera style perturbation (colour/brightness shift, blur, JPEG q=35,
                  random crop) to reduce the "same video" optimism.
- hard negatives = every other object in the gallery, including same-category look-alikes;
                  the score that matters is the best impostor's.

Protocols (each query is run twice):
- closed-set: the true item is in the gallery → can the top-1 be auto-matched correctly?
- open-set:   the true item is removed → any auto-match is a FALSE match (owner's item not found yet,
              which is the common case in a lost-and-found).
Metrics per threshold t on the reranker probability (the production score):
  precision = TP / (TP + FP_closed + FP_open)   (assumes 50% of searches have their item present)
  recall    = TP / N_closed
  F1, false_match_rate_open = FP_open / N_open, wrong_top1_rate_closed = FP_closed / N_closed
Selection: the smallest t whose CALIBRATION precision >= --target-precision (default 0.95);
the TEST split (disjoint sequences) is reported with that t. Cosine is NOT a probability; the
reranker output is used because it is what the service thresholds, and both are reported.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

CATS = {"laptop": "laptop", "cellphone": "mobile_phone", "book": "book"}


def perturb(im: Image.Image, rng) -> Image.Image:
    w, h = im.size
    f = rng.uniform(0.75, 0.95)
    cw, ch = int(w * f), int(h * f)
    x, y = rng.integers(0, w - cw + 1), rng.integers(0, h - ch + 1)
    im = im.crop((x, y, x + cw, y + ch))
    im = ImageEnhance.Brightness(im).enhance(rng.uniform(0.7, 1.3))
    im = ImageEnhance.Color(im).enhance(rng.uniform(0.6, 1.4))
    im = im.filter(ImageFilter.GaussianBlur(rng.uniform(0.0, 1.5)))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=35)
    return Image.open(io.BytesIO(buf.getvalue())).convert("RGB")


def sweep(top1_closed, correct_closed, top1_open, thresholds):
    rows = []
    n = len(top1_closed)
    for t in thresholds:
        tp = int(np.sum((top1_closed >= t) & correct_closed))
        fpc = int(np.sum((top1_closed >= t) & ~correct_closed))
        fpo = int(np.sum(top1_open >= t))
        prec = tp / (tp + fpc + fpo) if (tp + fpc + fpo) else 1.0
        rec = tp / n if n else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        rows.append({"t": round(float(t), 3), "precision": round(prec, 4), "recall": round(rec, 4),
                     "f1": round(f1, 4), "false_match_rate_open": round(fpo / n, 4),
                     "wrong_top1_rate_closed": round(fpc / n, 4), "tp": tp, "fp_closed": fpc, "fp_open": fpo, "n": n})
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--co3d-dir", type=Path, default=ROOT / "data/raw/co3d_research_only")
    ap.add_argument("--queries-per-seq", type=int, default=2)
    ap.add_argument("--target-precision", type=float, default=0.95)
    ap.add_argument("--out", type=Path, default=ROOT / "reports/calibration/match_threshold_calibration.json")
    ap.add_argument("--write-config", action="store_true")
    args = ap.parse_args()
    if not args.co3d_dir.exists():
        raise SystemExit(f"{args.co3d_dir} not found. CO3D is research-only and not in git; see "
                         "docs/datasets/CO3D.md. Without data, the provisional default threshold stays in force.")

    from run_inference import LiveModels, CANDIDATE_PROB
    os.chdir(ROOT)
    models = LiveModels(device="cpu")
    rng = np.random.default_rng(0)

    seqs = []
    for cat in CATS:
        for s in sorted((args.co3d_dir / cat).iterdir()):
            imgs = sorted((s / "images").glob("*.jpg"))
            if len(imgs) >= 6:
                seqs.append((cat, s.name, imgs))
    print(f"{len(seqs)} objects", flush=True)

    def emb(im):
        return models.embed_siglip_image(im), models.embed_visual(im)

    t0 = time.time()
    G_s, G_v, Q = [], [], []
    for gi, (cat, name, imgs) in enumerate(seqs):
        g = Image.open(imgs[0]).convert("RGB")
        s, v = emb(g)
        G_s.append(s); G_v.append(v)
        picks = [imgs[len(imgs) * (k + 1) // (args.queries_per_seq + 1)] for k in range(args.queries_per_seq)]
        for p in picks:
            q = Image.open(p).convert("RGB")
            for variant, im in (("clean", q), ("perturbed", perturb(q, rng))):
                qs, qv = emb(im)
                Q.append({"gi": gi, "cat": cat, "variant": variant, "s": qs, "v": qv,
                          "split": "calib" if int(hashlib.sha256(name.encode()).hexdigest()[:8], 16) % 10 < 6 else "test"})
    G_s, G_v = np.stack(G_s), np.stack(G_v)
    print(f"embedded {len(seqs)} gallery + {len(Q)} queries in {time.time()-t0:.0f}s", flush=True)

    def prob(s, v):
        X = np.stack([s, v, np.zeros_like(s), np.ones_like(s)], 1)
        return models.reranker.predict_proba(X)[:, 1]

    for q in Q:
        ss, vv = G_s @ q["s"], G_v @ q["v"]
        p = prob(ss, vv)
        order = np.argsort(-p)
        q["top1_closed"] = float(p[order[0]]); q["correct"] = int(order[0]) == q["gi"]
        q["true_prob"] = float(p[q["gi"]]); q["true_cos"] = float(ss[q["gi"]])
        mask = np.ones(len(p), bool); mask[q["gi"]] = False
        q["top1_open"] = float(p[mask].max())
        q["top1_open_cos"] = float(ss[mask].max())
        same = [j for j in range(len(seqs)) if seqs[j][0] == q["cat"] and j != q["gi"]]
        q["best_same_cat_impostor_cos"] = float(ss[same].max()) if same else None

    thresholds = np.round(np.arange(0.50, 1.0001, 0.01), 3)
    out = {"date": time.strftime("%Y-%m-%d"), "dataset": "CO3D (research-only; local only)",
           "objects": len(seqs), "objects_by_category": {c: sum(1 for s in seqs if s[0] == c) for c in CATS},
           "queries": len(Q), "candidate_prob_in_service": CANDIDATE_PROB, "target_precision": args.target_precision,
           "caveat": ("Query and gallery frames come from the same capture video (same session, lighting, "
                      "background). 'perturbed' simulates a different camera but this is still optimistic "
                      "versus campus reality. Validate on the campus protocol (docs/CAMPUS_VALIDATION.md)."),
           "results": {}}
    chosen = None
    for variant in ("clean", "perturbed", "all"):
        sel = [q for q in Q if variant == "all" or q["variant"] == variant]
        block = {}
        for split in ("calib", "test"):
            qs = [q for q in sel if q["split"] == split]
            rows = sweep(np.array([q["top1_closed"] for q in qs]), np.array([q["correct"] for q in qs]),
                         np.array([q["top1_open"] for q in qs]), thresholds)
            block[split] = {"n": len(qs), "R@1_closed": round(float(np.mean([q["correct"] for q in qs])), 4),
                            "mean_true_cos": round(float(np.mean([q["true_cos"] for q in qs])), 4),
                            "mean_best_impostor_cos_open": round(float(np.mean([q["top1_open_cos"] for q in qs])), 4),
                            "sweep": rows}
        ok = [r for r in block["calib"]["sweep"] if r["precision"] >= args.target_precision and r["tp"] > 0]
        t_sel = ok[0]["t"] if ok else None
        block["selected_threshold_on_calib"] = t_sel
        block["test_at_selected"] = next((r for r in block["test"]["sweep"] if r["t"] == t_sel), None)
        out["results"][variant] = block
        if variant == "all":
            chosen = t_sel
        print(variant, "t* =", t_sel, "test:", block["test_at_selected"], flush=True)

    out["recommended_auto_match_min_score"] = chosen
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=1))
    print("wrote", args.out)
    if args.write_config and chosen is not None:
        cfg = {"auto_match_min_score": max(chosen, CANDIDATE_PROB),
               "applies_to": "reranker probability for image or image+text queries; text-only never auto-matches",
               "selected_by": f"scripts/evaluation/calibrate_match_threshold.py, calib precision >= {args.target_precision}",
               "test_metrics": out["results"]["all"]["test_at_selected"],
               "date": out["date"], "data": "CO3D held-out sequences (clean + perturbed queries)",
               "caveat": out["caveat"]}
        p = ROOT / "configs" / "matching_thresholds.json"
        p.write_text(json.dumps(cfg, indent=1) + "\n")
        print("wrote", p)


if __name__ == "__main__":
    main()
