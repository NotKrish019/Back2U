"""Evaluate the live pipeline on the 28-object campus validation set (docs/campus_validation/PROTOCOL.md).

    python scripts/evaluation/campus_eval.py [--root data/raw/campus_validation] [--out reports/campus/]

Never fabricates data: if no collected objects are found, it prints NOT_COLLECTED and exits 2.

What it measures, using the production code path (FinalInferencePipeline, open-set gate, reranker):
- Retrieval: gallery = every object's FOUND views (view_03/view_04) as one gallery item per object;
  queries = OWNER views (view_01/view_02). Recall@1/@5, MRR; per category; look-alike pairs
  (slots 01 vs 02) reported separately: "lookalike_confusion" = query of slot 01 ranked its twin
  (slot 02) above itself, and vice versa.
- Auto-match threshold (configs/matching_thresholds.json or --threshold): precision, recall, F1
  (closed-set) and false-match rate in the open-set protocol (the query's own object removed).
- Open-set gate decisions on every view and on the extra negatives (``negatives/`` folder).
- Fold split (instance-level, deterministic): fold_a = slots 01+03, fold_b = slots 02+04. If campus
  data is ever used to re-tune a threshold, tune on one fold and report the other (and swap).
  Look-alike twins are in different folds on purpose, so a fold never sees both twins.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

OWNER_VIEWS = ("view_01", "view_02")
FOUND_VIEWS = ("view_03", "view_04")
REQUIRED_FIELDS = ("category", "physical_instance_id", "consent", "views")


def fold_of(slot: str) -> str:
    return "fold_a" if slot in ("01", "03") else "fold_b"


def discover(root: Path) -> tuple[list[dict], list[str]]:
    """Collected objects with their views. Returns (objects, problems)."""
    objects, problems = [], []
    if not root.exists():
        return objects, [f"{root} does not exist"]
    for meta_path in sorted(root.glob("*/*/instance.json")):
        d = meta_path.parent
        try:
            meta = json.loads(meta_path.read_text())
        except ValueError as e:
            problems.append(f"{meta_path}: invalid JSON ({e})")
            continue
        missing = [f for f in REQUIRED_FIELDS if f not in meta]
        if missing:
            problems.append(f"{meta_path}: missing fields {missing}")
            continue
        if not (meta.get("consent") or {}).get("granted"):
            problems.append(f"{meta_path}: consent not recorded → object excluded")
            continue
        views = {}
        for v in OWNER_VIEWS + FOUND_VIEWS:
            hits = sorted(d.glob(f"{v}.*"))
            hits = [h for h in hits if h.suffix.lower() in (".jpg", ".jpeg", ".png", ".heic", ".webp")]
            if hits:
                views[v] = hits[0]
        if not any(v in views for v in OWNER_VIEWS) or not any(v in views for v in FOUND_VIEWS):
            problems.append(f"{d}: needs >=1 owner view (01/02) and >=1 found view (03/04)")
            continue
        slot = d.name.rsplit("_", 1)[-1]
        objects.append({"id": meta["physical_instance_id"], "category": meta["category"], "slot": slot,
                        "fold": fold_of(slot), "dir": d, "views": views})
    return objects, problems


def evaluate(objects: list[dict], pipe, threshold: float, negatives: list[Path]) -> dict:
    from PIL import Image
    from run_inference import open_image_bytes

    def load(p: Path):
        return open_image_bytes(p.read_bytes())[0]

    # gallery: found views
    for o in objects:
        for v in FOUND_VIEWS:
            if v in o["views"]:
                pipe.add_image_bytes(o["views"][v].read_bytes(), o["id"], o["category"])
    ids = [o["id"] for o in objects]
    twin = {}
    for o in objects:
        if o["slot"] in ("01", "02"):
            other = f"{o['category']}_{'02' if o['slot'] == '01' else '01'}"
            t = next((x["id"] for x in objects if x["id"].endswith(other)), None)
            if t:
                twin[o["id"]] = t

    rows, gate_rows = [], []
    for o in objects:
        for v in OWNER_VIEWS:
            if v not in o["views"]:
                continue
            im = load(o["views"][v])
            closed = pipe.infer_pil(im, top_k=len(ids))
            ranked = [m["item_id"] for m in closed["matches"]]
            rank = ranked.index(o["id"]) + 1 if o["id"] in ranked else None
            top = closed["matches"][0] if closed["matches"] else None
            opened = pipe.infer_pil(im, top_k=1, allowed_ids=[i for i in ids if i != o["id"]])
            otop = opened["matches"][0] if opened["matches"] else None
            rows.append({
                "object": o["id"], "category": o["category"], "fold": o["fold"], "view": v,
                "gate": closed["perception"]["decision"], "gate_category": closed["perception"]["category"],
                "rank": rank, "top1": top["item_id"] if top else None,
                "top1_score": top["final_score"] if top else None,
                "top1_decision": top["decision"] if top else None,
                "open_top1": otop["item_id"] if otop else None,
                "open_top1_score": otop["final_score"] if otop else None,
                "twin": twin.get(o["id"]),
                "twin_rank": ranked.index(twin[o["id"]]) + 1 if o["id"] in twin and twin[o["id"]] in ranked else None,
            })
        for v, p in o["views"].items():
            g = pipe.infer_pil(load(p), top_k=1)["perception"]
            gate_rows.append({"object": o["id"], "view": v, "category": o["category"], **g})
    for p in negatives:
        g = pipe.infer_pil(load(p), top_k=1)["perception"]
        gate_rows.append({"object": None, "view": p.name, "category": "negative", **g})

    def summary(sel):
        n = len(sel)
        if not n:
            return {"n": 0}
        ranks = [r["rank"] or 10 ** 6 for r in sel]
        auto = lambda r, key="top1": (r[f"{key}_score"] or 0) >= threshold and r["gate"] == "SUPPORTED"
        tp = sum(1 for r in sel if auto(r) and r["top1"] == r["object"])
        fpc = sum(1 for r in sel if auto(r) and r["top1"] != r["object"])
        fpo = sum(1 for r in sel if auto(r, "open_top1"))
        prec = tp / (tp + fpc + fpo) if tp + fpc + fpo else None
        rec = tp / n
        return {"n": n, "R@1": round(sum(k == 1 for k in ranks) / n, 4), "R@5": round(sum(k <= 5 for k in ranks) / n, 4),
                "MRR": round(float(np.mean([1 / k for k in ranks])), 4),
                "auto_match": {"threshold": threshold, "precision": None if prec is None else round(prec, 4),
                               "recall": round(rec, 4),
                               "f1": None if not prec else round(2 * prec * rec / (prec + rec), 4) if (prec + rec) else 0.0,
                               "false_match_rate_open": round(fpo / n, 4), "tp": tp, "fp_closed": fpc, "fp_open": fpo}}

    tw = [r for r in rows if r["twin"]]
    out = {
        "overall": summary(rows),
        "by_fold": {f: summary([r for r in rows if r["fold"] == f]) for f in ("fold_a", "fold_b")},
        "by_category": {c: summary([r for r in rows if r["category"] == c]) for c in sorted({r["category"] for r in rows})},
        "lookalike": {"queries": len(tw),
                      "twin_ranked_above_self": sum(1 for r in tw if r["twin_rank"] and (r["rank"] or 10 ** 6) > r["twin_rank"]),
                      "twin_auto_matched": sum(1 for r in tw if r["top1"] == r["twin"] and (r["top1_score"] or 0) >= threshold)},
        "gate": {"object_views": {d: sum(1 for g in gate_rows if g["object"] and g["decision"] == d)
                                  for d in ("SUPPORTED", "UNCERTAIN", "UNSUPPORTED_ITEM")},
                 "object_views_wrong_category_SUPPORTED": sum(1 for g in gate_rows if g["object"] and g["decision"] == "SUPPORTED"
                                                              and g["category"] != g["object"].split(":")[-1].rsplit("_", 1)[0]),
                 "negatives": {d: sum(1 for g in gate_rows if not g["object"] and g["decision"] == d)
                               for d in ("SUPPORTED", "UNCERTAIN", "UNSUPPORTED_ITEM")}},
        "per_query": rows,
    }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=ROOT / "data/raw/campus_validation")
    ap.add_argument("--out", type=Path, default=ROOT / "reports/campus/campus_eval.json")
    ap.add_argument("--threshold", type=float, default=None)
    args = ap.parse_args()

    objects, problems = discover(args.root)
    for p in problems:
        print("WARN", p, file=sys.stderr)
    if not objects:
        print(json.dumps({"status": "NOT_COLLECTED", "root": str(args.root), "problems": problems,
                          "next_step": "collect photos as described in docs/campus_validation/PROTOCOL.md"}, indent=1))
        sys.exit(2)
    if args.threshold is None:
        from src.api.services.matching import AutoMatchPolicy
        args.threshold = AutoMatchPolicy.load().min_score
    negatives = sorted((args.root / "negatives").glob("*.jp*g")) if (args.root / "negatives").exists() else []

    from run_inference import FinalInferencePipeline
    os.chdir(ROOT)
    pipe = FinalInferencePipeline(store_dir=tempfile.mkdtemp(prefix="b2u_campus_"))
    t0 = time.time()
    res = evaluate(objects, pipe, args.threshold, negatives)
    res.update({"status": "OK", "date": time.strftime("%Y-%m-%d"), "objects": len(objects),
                "model_version": pipe.model_version, "problems": problems, "seconds": round(time.time() - t0, 1)})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(res, indent=1, default=str))
    print(json.dumps({k: v for k, v in res.items() if k != "per_query"}, indent=1, default=str))


if __name__ == "__main__":
    main()
