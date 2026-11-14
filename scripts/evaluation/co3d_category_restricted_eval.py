"""Phase 2C Task 2: mixed vs ORACLE category-restricted gallery, using the EXISTING embeddings of the
co3d_pilot run (no re-embedding, same checkpoint) and the QC-derived identities.

    python scripts/evaluation/co3d_category_restricted_eval.py
"""
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from src.evaluation.phase2.retrieval_eval_qc import evaluate_qc  # noqa: E402

RUN = ROOT / "reports/evaluation/phase2_runs/co3d_pilot"
DERIVED = ROOT / "data/processed/co3d_phase2_qc_reviewed_manifest.jsonl"
REL = ROOT / "data/processed/co3d_phase2_identity_relations.json"
OUT = ROOT / "reports/evaluation/phase2_runs/co3d_pilot/category_restricted"
CONDS = ["A_full_image", "B_detector_crop", "C_ground_truth_crop", "D_detector_crop_letterbox", "A_full_image_letterbox"]


def main():
    recs = [json.loads(l) for l in DERIVED.read_text().splitlines() if l.strip()]
    rel = json.loads(REL.read_text())
    inst = {r["source_sequence_id"]: r["physical_instance_id"] for r in recs}
    uncertain = {frozenset((inst[a], inst[b])) for a, b in rel["uncertain_relationships"] if a in inst and b in inst}
    summary = json.loads((RUN / "metrics_summary.json").read_text())
    assert summary["checkpoint_sha256"].startswith("7aef423c")
    OUT.mkdir(parents=True, exist_ok=True)
    result = {"qc_applied": rel["qc_applied"], "n_uncertain_relationships": len(uncertain),
              "model_version": summary["model_version"], "conditions": {}}
    print(f"QC applied: {rel['qc_applied']} | uncertain relationships excluded from HN: {len(uncertain)}")
    for cond in CONDS:
        keys = json.loads((RUN / cond / "gallery_keys.json").read_text())
        emb = np.load(RUN / cond / "embeddings.npy")
        row = {f"{k.split('/')[0].split(':', 1)[1]}/{k.split('/')[1]}": i for i, k in enumerate(keys)}
        idx = [row[f"{r['source_sequence_id']}/{r['view_id']}"] for r in recs]
        E = emb[idx]
        res = {}
        for mode, restrict in (("mixed", False), ("category_restricted_ORACLE", True)):
            per_q, m = evaluate_qc(recs, E, (1, 5, 10), restrict_category=restrict, uncertain_pairs=uncertain)
            (OUT / f"{cond}__{mode}.jsonl").write_text("".join(json.dumps(x) + "\n" for x in per_q))
            res[mode] = m
            o = m["overall"]
            print(f"{cond:27s} {mode:27s} n={o['n_queries']} R@1={o['recall@1']:.3f} R@5={o['recall@5']:.3f} "
                  f"R@10={o['recall@10']:.3f} MRR={o['mrr']:.3f} HN={o['hard_negative_top1_accuracy']:.3f} "
                  f"errors={o['top1_errors']} | " +
                  " ".join(f"{c}:{v['recall@1']:.3f}" for c, v in m["per_category"].items()))
        result["conditions"][cond] = res
    (OUT / "summary.json").write_text(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
