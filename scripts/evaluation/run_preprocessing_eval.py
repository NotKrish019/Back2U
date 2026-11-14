"""Phase 2 preprocessing comparison (evaluation only — never touches production state).

    python scripts/evaluation/run_preprocessing_eval.py --config scripts/evaluation/configs/<name>.json

Config keys: run_name, manifest, checkpoint, expected_checkpoint_sha256, conditions,
sources/categories/splits (filters), inputs_are_precropped, ks, output_dir, evidence_level.
Outputs (under output_dir/run_name): metrics_summary.json, run_environment.json, detections.json,
and per condition: preprocessing.jsonl, predictions.jsonl, metrics.json, embeddings.npy, gallery_keys.json.
"""
import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "True")  # torch + faiss libomp (see Phase 1 report)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    args = ap.parse_args()
    config = json.loads(Path(args.config).read_text())
    os.chdir(ROOT)

    from src.evaluation.phase2.models import EvalModels
    from src.evaluation.phase2.runner import run
    from src.evaluation.phase2.preprocessing import NEEDS_DETECTOR

    needs_det = any(c in NEEDS_DETECTOR for c in config["conditions"]) and not config.get("inputs_are_precropped")
    models = EvalModels(str(ROOT / config["checkpoint"]), load_detector=needs_det)
    summary = run(config, models, ROOT)
    for cond, res in summary["conditions"].items():
        if res["status"] != "RUN":
            print(f"{cond:28s} BLOCKED: {res['reason']}")
            continue
        print(f"{cond:28s} n_q={res['n_queries']:3d} inst={res['n_query_instances']:3d} "
              f"R@1={res['recall@1']:.3f} R@5={res['recall@5']:.3f} R@10={res['recall@10']:.3f} "
              f"MRR={res['mrr']:.3f} HN@1={res['hard_negative_top1_accuracy']} crops={res['crop_sources']}")
    print("model_version:", summary["model_version"], "| outputs:", summary["output_dir"])


if __name__ == "__main__":
    main()
