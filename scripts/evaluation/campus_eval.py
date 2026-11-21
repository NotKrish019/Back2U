"""Evaluate the live pipeline on the 28-object campus validation set (docs/campus_validation/PROTOCOL.md).

    python scripts/evaluation/campus_eval.py [--root data/raw/campus_validation]
           [--out reports/campus/campus_eval.json] [--threshold T]
           [--validate-only] [--allow-incomplete] [--allow-near-duplicates]
           [--dev-fold fold_a|fold_b] [--sweep-start 0.50 --sweep-stop 0.99 --sweep-step 0.01]

Never fabricates data. The dataset is validated BEFORE any model is loaded
(src/evaluation/campus/dataset.py, EXECUTION_PLAN §K-1/§K-2/§K-5):

  exit 0  OK (or INCOMPLETE with --allow-incomplete, reported as status INCOMPLETE_ALLOWED)
  exit 2  NOT_COLLECTED  root missing or empty
  exit 3  INVALID        schema/consistency errors, unknown/contradictory look-alike references,
                         duplicate or near-duplicate images (near-duplicates can be accepted after
                         human review with --allow-near-duplicates; exact duplicates never)
  exit 4  INCOMPLETE     valid but short of the protocol (missing views/objects/pairs, no consent)

What it measures, using the production code path (FinalInferencePipeline, open-set gate, reranker,
and src.api.services.matching.should_auto_match for suggestions):
- Retrieval: gallery = each object's FOUND views (view_03/04) under one gallery item; queries = OWNER
  views (view_01/02). Recall@1/@5, MRR, per category and per fold.
- Look-alikes: pairs come ONLY from ``lookalike_of`` metadata (never slot numbers or folder order).
- Suggestions at the deployed threshold: precision, coverage, open-set false-match rate.
- Open-set gate decisions on every view and on ``negatives/``.
- Confidence intervals (§K-3): 95% Wilson, cluster-adjusted by physical object; see
  src/evaluation/campus/stats.py. MRR has no interval (stated in the output).
- Threshold sweep (§K-4): analysis only, per fold, labelled development / held-out; never writes
  configuration and never selects a threshold.
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

from src.evaluation.campus import sweep as SW  # noqa: E402
from src.evaluation.campus.dataset import (FOUND_VIEWS, OWNER_VIEWS, STATUS_EXIT,  # noqa: E402,F401
                                           fold_of, load_dataset)
from src.evaluation.campus.stats import METHOD_NOTE, proportion  # noqa: E402

MRR_CI_NOTE = "no interval: MRR is not a proportion and an object-level bootstrap is unstable at ~28 objects"


def discover(root: Path) -> tuple[list[dict], list[str]]:
    """Backward-compatible wrapper: (evaluable objects, human-readable problems)."""
    rep = load_dataset(Path(root))
    problems = [f"{i.code}: {i.object or i.image or i.field or ''} {i.message}".strip()
                for i in rep.errors + rep.incomplete]
    return rep.objects, problems


def _suggested(score, decision, gate, threshold) -> bool:
    return SW.suggested(score, decision, gate, threshold)


def evaluate(objects: list[dict], pipe, threshold: float, negatives: list, pairs=None) -> dict:
    """Run the pipeline on validated objects. Look-alike twins come from ``o["twin"]`` (set by
    load_dataset from lookalike_of) or from ``pairs``; never from slot numbers."""
    from run_inference import open_image_bytes

    def load(p: Path):
        return open_image_bytes(Path(p).read_bytes())[0]

    twin = {o["id"]: o.get("twin") for o in objects}
    for a, b in pairs or []:
        twin[a], twin[b] = b, a

    for o in objects:
        for v in FOUND_VIEWS:
            if v in o["views"]:
                pipe.add_image_bytes(Path(o["views"][v]).read_bytes(), o["id"], o["category"])
    ids = [o["id"] for o in objects]

    rows, gate_rows, latency = [], [], []
    for o in objects:
        for v in OWNER_VIEWS:
            if v not in o["views"]:
                continue
            im = load(o["views"][v])
            t0 = time.perf_counter()
            closed = pipe.infer_pil(im, top_k=len(ids))
            latency.append(time.perf_counter() - t0)
            ranked = [m["item_id"] for m in closed["matches"]]
            rank = ranked.index(o["id"]) + 1 if o["id"] in ranked else None
            top = closed["matches"][0] if closed["matches"] else None
            opened = pipe.infer_pil(im, top_k=1, allowed_ids=[i for i in ids if i != o["id"]])
            otop = opened["matches"][0] if opened["matches"] else None
            tw = twin.get(o["id"])
            rows.append({
                "object": o["id"], "category": o["category"], "fold": o["fold"], "view": v,
                "gate": closed["perception"]["decision"], "gate_category": closed["perception"]["category"],
                "rank": rank, "top1": top["item_id"] if top else None,
                "top1_score": top["final_score"] if top else None,
                "top1_decision": top["decision"] if top else None,
                "open_top1": otop["item_id"] if otop else None,
                "open_top1_score": otop["final_score"] if otop else None,
                "open_top1_decision": otop["decision"] if otop else None,
                "twin": tw,
                "twin_rank": ranked.index(tw) + 1 if tw and tw in ranked else None,
            })
        for v, p in o["views"].items():
            g = pipe.infer_pil(load(p), top_k=1)["perception"]
            gate_rows.append({"object": o["id"], "view": v, "true_category": o["category"],
                              "decision": g["decision"], "category": g["category"]})
    for n in negatives:
        path = n["path"] if isinstance(n, dict) else n
        nid = n["id"] if isinstance(n, dict) else f"campus_val:negative:{Path(path).stem}"
        g = pipe.infer_pil(load(path), top_k=1)["perception"]
        gate_rows.append({"object": None, "negative": nid, "view": Path(path).name, "true_category": "negative",
                          "decision": g["decision"], "category": g["category"]})

    out = {
        "overall": _retrieval_summary(rows, threshold),
        "by_fold": {f: _retrieval_summary([r for r in rows if r["fold"] == f], threshold) for f in ("fold_a", "fold_b")},
        "by_category": {c: _retrieval_summary([r for r in rows if r["category"] == c], threshold)
                        for c in sorted({r["category"] for r in rows})},
        "lookalike": _lookalike_summary(rows, threshold),
        "gate": _gate_summary(gate_rows),
        "latency_s": {"n": len(latency), "median": round(float(np.median(latency)), 4) if latency else None,
                      "p90": round(float(np.percentile(latency, 90)), 4) if latency else None},
        "ci_method": METHOD_NOTE,
        "per_query": rows,
    }
    return out


def _retrieval_summary(sel: list[dict], threshold: float) -> dict:
    n = len(sel)
    if not n:
        return {"n": 0}
    ranks = [r["rank"] or 10 ** 6 for r in sel]
    closed = [(r["object"], r["top1"] == r["object"]) for r in sel
              if _suggested(r["top1_score"], r["top1_decision"], r["gate"], threshold)]
    open_ = [(r["object"], False) for r in sel
             if _suggested(r["open_top1_score"], r["open_top1_decision"], r["gate"], threshold)]
    tp = sum(ok for _, ok in closed)
    fpc, fpo = len(closed) - tp, len(open_)
    prec = tp / (tp + fpc + fpo) if tp + fpc + fpo else None
    rec = tp / n
    r1 = proportion([(r["object"], k == 1) for r, k in zip(sel, ranks)])
    r5 = proportion([(r["object"], k <= 5) for r, k in zip(sel, ranks)])
    return {
        "n": n, "objects": len({r["object"] for r in sel}),
        "R@1": r1["point"], "R@5": r5["point"],
        "MRR": round(float(np.mean([1 / k for k in ranks])), 4),
        "gate_stopped": sum(1 for r in sel if r["gate"] == "UNSUPPORTED_ITEM"),
        "ci": {"R@1": r1, "R@5": r5, "MRR": MRR_CI_NOTE},
        "auto_match": {
            "threshold": threshold, "precision": None if prec is None else round(prec, 4),
            "recall": round(rec, 4),
            "f1": None if not prec else (round(2 * prec * rec / (prec + rec), 4) if (prec + rec) else 0.0),
            "false_match_rate_open": round(fpo / n, 4), "tp": tp, "fp_closed": fpc, "fp_open": fpo,
            "ci": {
                "precision": proportion(closed + open_),
                "coverage": proportion([(r["object"], _suggested(r["top1_score"], r["top1_decision"], r["gate"],
                                                                 threshold)) for r in sel]),
                "false_match_rate_open": proportion([(r["object"], _suggested(
                    r["open_top1_score"], r["open_top1_decision"], r["gate"], threshold)) for r in sel]),
            },
            "needs_human_browsing": n - len(closed),
            "note": "retrieval accuracy (R@k) and suggestion precision are different questions; "
                    "a high R@5 does not make automatic suggestions safe",
        },
    }


def _lookalike_summary(rows: list[dict], threshold: float) -> dict:
    tw = [r for r in rows if r["twin"]]
    above = [(r["object"], bool(r["twin_rank"]) and (r["rank"] or 10 ** 6) > r["twin_rank"]) for r in tw]
    twin_sugg = [(r["object"], r["top1"] == r["twin"] and _suggested(r["top1_score"], r["top1_decision"],
                                                                     r["gate"], threshold)) for r in tw]
    return {"source": "lookalike_of metadata", "queries": len(tw),
            "pairs": len({tuple(sorted((r["object"], r["twin"]))) for r in tw}),
            "twin_ranked_above_self": sum(x for _, x in above),
            "twin_auto_matched": sum(x for _, x in twin_sugg),
            "ci": {"twin_ranked_above_self": proportion(above), "twin_auto_matched": proportion(twin_sugg)}}


def _gate_summary(gate_rows: list[dict]) -> dict:
    obj = [g for g in gate_rows if g["object"]]
    neg = [g for g in gate_rows if not g["object"]]

    def rates(sel):
        return {
            "correct_category_SUPPORTED": proportion([(g["object"], g["decision"] == "SUPPORTED"
                                                       and g["category"] == g["true_category"]) for g in sel]),
            "wrong_category_SUPPORTED": proportion([(g["object"], g["decision"] == "SUPPORTED"
                                                     and g["category"] != g["true_category"]) for g in sel]),
            "UNCERTAIN": proportion([(g["object"], g["decision"] == "UNCERTAIN") for g in sel]),
            "supported_rejected_UNSUPPORTED": proportion([(g["object"], g["decision"] == "UNSUPPORTED_ITEM")
                                                          for g in sel]),
        }

    return {
        "object_views": {d: sum(1 for g in obj if g["decision"] == d) for d in ("SUPPORTED", "UNCERTAIN", "UNSUPPORTED_ITEM")},
        "object_views_wrong_category_SUPPORTED": sum(1 for g in obj if g["decision"] == "SUPPORTED"
                                                     and g["category"] != g["true_category"]),
        "negatives": {d: sum(1 for g in neg if g["decision"] == d) for d in ("SUPPORTED", "UNCERTAIN", "UNSUPPORTED_ITEM")},
        "rates_supported_views": rates(obj),
        "rates_by_category": {c: rates([g for g in obj if g["true_category"] == c])
                              for c in sorted({g["true_category"] for g in obj})},
        "rates_negatives": {
            "rejected_UNSUPPORTED": proportion([(g["negative"], g["decision"] == "UNSUPPORTED_ITEM") for g in neg]),
            "leaked_SUPPORTED": proportion([(g["negative"], g["decision"] == "SUPPORTED") for g in neg]),
        },
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", type=Path, default=ROOT / "data/raw/campus_validation")
    ap.add_argument("--out", type=Path, default=ROOT / "reports/campus/campus_eval.json")
    ap.add_argument("--threshold", type=float, default=None)
    ap.add_argument("--validate-only", action="store_true", help="validate the dataset, load no models")
    ap.add_argument("--allow-incomplete", action="store_true",
                    help="evaluate a valid but protocol-incomplete dataset (reported as INCOMPLETE_ALLOWED)")
    ap.add_argument("--allow-near-duplicates", action="store_true",
                    help="downgrade near-duplicate findings to warnings AFTER human review (never exact duplicates)")
    ap.add_argument("--dev-fold", choices=("fold_a", "fold_b"), default=None,
                    help="label this fold as development for the threshold sweep; the other is held out")
    ap.add_argument("--sweep-start", type=float, default=SW.DEFAULT_START)
    ap.add_argument("--sweep-stop", type=float, default=SW.DEFAULT_STOP)
    ap.add_argument("--sweep-step", type=float, default=SW.DEFAULT_STEP)
    args = ap.parse_args(argv)

    rep = load_dataset(args.root, allow_near_duplicates=args.allow_near_duplicates)
    validation = rep.summary()
    for i in rep.errors:
        print("ERROR", json.dumps(i.to_dict()), file=sys.stderr)
    for i in rep.incomplete:
        print("INCOMPLETE", json.dumps(i.to_dict()), file=sys.stderr)

    status = rep.status
    if status == "NOT_COLLECTED":
        print(json.dumps({"status": "NOT_COLLECTED", "root": str(args.root), "validation": validation,
                          "next_step": "collect photos as described in docs/campus_validation/PROTOCOL.md"}, indent=1))
        return STATUS_EXIT["NOT_COLLECTED"]
    if status == "INVALID":
        print(json.dumps({"status": "INVALID", "validation": validation}, indent=1))
        return STATUS_EXIT["INVALID"]
    if status == "INCOMPLETE" and not args.allow_incomplete:
        print(json.dumps({"status": "INCOMPLETE", "validation": validation,
                          "next_step": "complete the collection, or re-run with --allow-incomplete to evaluate "
                                       "what exists (the report will be marked INCOMPLETE_ALLOWED)"}, indent=1))
        return STATUS_EXIT["INCOMPLETE"]
    final_status = "INCOMPLETE_ALLOWED" if status == "INCOMPLETE" else "OK"
    if args.validate_only:
        print(json.dumps({"status": final_status, "validation": validation}, indent=1))
        return 0

    if args.threshold is None:
        from src.api.services.matching import AutoMatchPolicy
        args.threshold = AutoMatchPolicy.load().min_score
    ts = SW.thresholds(args.sweep_start, args.sweep_stop, args.sweep_step)

    from run_inference import FinalInferencePipeline
    os.chdir(ROOT)
    pipe = FinalInferencePipeline(store_dir=tempfile.mkdtemp(prefix="b2u_campus_"))  # never the live gallery
    t0 = time.time()
    res = evaluate(rep.objects, pipe, args.threshold, rep.negatives)
    res["threshold_sweep"] = SW.threshold_sweep(res["per_query"], ts, args.threshold, args.dev_fold)
    res.update({"status": final_status, "date": time.strftime("%Y-%m-%d"), "objects": len(rep.objects),
                "model_version": pipe.model_version, "validation": validation,
                "seconds": round(time.time() - t0, 1)})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(res, indent=1, default=str))
    print(json.dumps({k: v for k, v in res.items() if k not in ("per_query", "threshold_sweep")}, indent=1, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
