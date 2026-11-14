"""Phase 2C Task 4: letterbox vs production transform with localisation and background held fixed.

  C_lb  ground-truth crop (mask box + 10 % padding)            → letterbox     (compare with C)
  F     object cut out by mask on flat mean canvas, padded crop → production    (re-embedded; = Phase 2B F)
  F_lb  same object-only input                                  → letterbox

Same checkpoint, same leave-one-out instance metrics, mixed gallery, QC-derived identities.
    python scripts/evaluation/co3d_aspect_diagnostics.py
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "True")
OUT = ROOT / "reports/evaluation/phase2_runs/co3d_pilot/aspect_diagnostics"
MEAN = (124, 116, 104)


def main():
    os.chdir(ROOT)
    from src.categories import DETECTOR_PHRASES
    from src.evaluation.phase2.models import EvalModels
    from src.evaluation.phase2.preprocessing import TRANSFORM_LETTERBOX, TRANSFORM_PRODUCTION
    from src.evaluation.phase2.retrieval_eval_qc import evaluate_qc
    from src.inference.crop import select_crop
    recs = [json.loads(l) for l in open(ROOT / "data/processed/co3d_phase2_qc_reviewed_manifest.jsonl")]
    rel = json.load(open(ROOT / "data/processed/co3d_phase2_identity_relations.json"))
    inst = {r["source_sequence_id"]: r["physical_instance_id"] for r in recs}
    unc = {frozenset((inst[a], inst[b])) for a, b in rel["uncertain_relationships"] if a in inst and b in inst}
    m = EvalModels(str(ROOT / "models/checkpoints/m4_c/best_val_recall_at_1.pt"), load_detector=False)
    assert m.checkpoint_sha256.startswith("7aef423c")
    vecs = {"C_lb_ground_truth_crop_letterbox": [], "F_object_on_flat": [], "F_lb_object_on_flat_letterbox": []}
    for r in recs:
        img = Image.open(ROOT / r["image_path"]).convert("RGB")
        det = [{"label": DETECTOR_PHRASES[r["category"]], "score": 1.0, "box": r["ground_truth_bbox"]}]
        crop, _ = select_crop(img, det)
        vecs["C_lb_ground_truth_crop_letterbox"].append(m.embed(crop, TRANSFORM_LETTERBOX))
        hard = Image.open(ROOT / r["mask_path"]).convert("L").point(lambda v: 255 if v >= 128 else 0)
        obj = Image.composite(img, Image.new("RGB", img.size, MEAN), hard)
        ocrop, _ = select_crop(obj, det)
        vecs["F_object_on_flat"].append(m.embed(ocrop, TRANSFORM_PRODUCTION))
        vecs["F_lb_object_on_flat_letterbox"].append(m.embed(ocrop, TRANSFORM_LETTERBOX))
    OUT.mkdir(parents=True, exist_ok=True)
    summary = {"model_version": m.model_version, "conditions": {}}
    for k, v in vecs.items():
        pq, met = evaluate_qc(recs, np.vstack(v), (1, 5, 10), uncertain_pairs=unc)
        (OUT / f"{k}_predictions.jsonl").write_text("".join(json.dumps(x) + "\n" for x in pq))
        summary["conditions"][k] = met
        o = met["overall"]
        print(f"{k:34s} R@1={o['recall@1']:.3f} R@5={o['recall@5']:.3f} MRR={o['mrr']:.3f} | " +
              " ".join(f"{c}:{x['recall@1']:.3f}" for c, x in met["per_category"].items()))
    (OUT / "summary.json").write_text(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
