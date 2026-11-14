"""Background-shortcut diagnostic for the CO3D pilot (evaluation only, same M4-C checkpoint).

Every view of a CO3D sequence shares one background, so full-image retrieval can succeed by matching
the background rather than the object. This script embeds, with the production transform:

  E_background_only   full frame with the object's (dilated) mask filled with the ImageNet mean colour
  F_object_on_flat    mask-cut object pasted on a flat ImageNet-mean canvas (no background at all),
                      then cropped to the mask box with production padding

and scores them with the same leave-one-out instance metrics as the preprocessing comparison.
If E (no object visible) retrieves well, full-image scores are dominated by background.

    python scripts/evaluation/co3d_background_shortcut.py
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "True")

MANIFEST = "data/processed/co3d_phase2_pilot_manifest.jsonl"
OUT = ROOT / "reports/evaluation/phase2_runs/co3d_pilot/background_shortcut"
MEAN = (124, 116, 104)


def main():
    os.chdir(ROOT)
    from src.evaluation.phase2.manifest import load_manifest, record_key
    from src.evaluation.phase2.models import EvalModels
    from src.evaluation.phase2.preprocessing import TRANSFORM_PRODUCTION
    from src.evaluation.phase2.retrieval_eval import evaluate
    from src.inference.crop import select_crop
    from src.categories import DETECTOR_PHRASES

    recs = sorted(load_manifest(ROOT / MANIFEST, ROOT), key=record_key)
    models = EvalModels(str(ROOT / "models/checkpoints/m4_c/best_val_recall_at_1.pt"), load_detector=False)
    assert models.checkpoint_sha256.startswith("7aef423c")
    embs = {"E_background_only": [], "F_object_on_flat": []}
    covered = []
    for r in recs:
        img = Image.open(r["_abs_path"]).convert("RGB")
        m = Image.open(ROOT / r["mask_path"]).convert("L")
        hard = m.point(lambda v: 255 if v >= 128 else 0)
        dil = hard.filter(ImageFilter.MaxFilter(15))  # hide object edges/shadow too
        flat = Image.new("RGB", img.size, MEAN)
        bg = Image.composite(flat, img, dil)
        covered.append(float(np.asarray(dil).mean() / 255))
        obj = Image.composite(img, flat, hard)
        crop, info = select_crop(obj, [{"label": DETECTOR_PHRASES[r["category"]], "score": 1.0, "box": r["ground_truth_bbox"]}])
        embs["E_background_only"].append(models.embed(bg, TRANSFORM_PRODUCTION))
        embs["F_object_on_flat"].append(models.embed(crop, TRANSFORM_PRODUCTION))
    OUT.mkdir(parents=True, exist_ok=True)
    summary = {"model_version": models.model_version, "checkpoint_sha256": models.checkpoint_sha256,
               "mask_dilation_px": 7, "mean_fraction_of_frame_hidden_in_E": round(float(np.mean(covered)), 4),
               "conditions": {}}
    for cond, vecs in embs.items():
        per_q, m = evaluate(recs, np.vstack(vecs), (1, 5, 10))
        (OUT / f"{cond}_predictions.jsonl").write_text("".join(json.dumps(x, sort_keys=True) + "\n" for x in per_q))
        summary["conditions"][cond] = {"overall": m["overall"], "per_category": m["per_category"]}
        o = m["overall"]
        print(f"{cond:20s} n_q={o['n_queries']} R@1={o['recall@1']:.3f} R@5={o['recall@5']:.3f} MRR={o['mrr']:.3f} | " +
              " ".join(f"{c}={v['recall@1']:.3f}" for c, v in m["per_category"].items()))
    (OUT / "summary.json").write_text(json.dumps(summary, indent=1, sort_keys=True))
    print("hidden fraction of frame (E):", summary["mean_fraction_of_frame_hidden_in_E"])


if __name__ == "__main__":
    main()
