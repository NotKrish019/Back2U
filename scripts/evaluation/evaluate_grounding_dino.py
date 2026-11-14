"""Evaluate Grounding DINO (production prompt + production select_crop) against verified boxes.

    python scripts/evaluation/evaluate_grounding_dino.py --run-name gdino_pilot \
        [--sources back2u_app_upload] [--diagnostic-dir data/uploads/mocks]

--diagnostic-dir runs a *qualitative* pass over images whose intended object is taken from the
filename (mock_<object>_*.jpg). Those are synthetic/mock images: reported separately, never mixed
into real-world metrics, and they have no verified boxes (only selected label + saved crop).
"""
import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "True")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="data/processed/phase2_evaluation_manifest.jsonl")
    ap.add_argument("--run-name", required=True)
    ap.add_argument("--sources", nargs="*")
    ap.add_argument("--diagnostic-dir")
    ap.add_argument("--output-dir", default="reports/evaluation/phase2_runs")
    args = ap.parse_args()
    os.chdir(ROOT)

    from PIL import Image
    from src.categories import normalize_category
    from src.evaluation.phase2 import detector_eval as D
    from src.evaluation.phase2.manifest import filter_records, load_manifest
    from src.evaluation.phase2.models import EvalModels
    from src.inference import versioning as V
    from src.inference.crop import select_crop

    out = ROOT / args.output_dir / args.run_name
    out.mkdir(parents=True, exist_ok=True)
    models = EvalModels(str(ROOT / V.M4C_CHECKPOINT), load_detector=True)

    records = filter_records(load_manifest(ROOT / args.manifest, ROOT), sources=args.sources)
    annotated = [r for r in records if r["ground_truth_bbox"] is not None and r.get("image_kind") == "original_photo"]
    rows = []
    for r in sorted(annotated, key=lambda r: r["image_path"]):
        img = Image.open(r["_abs_path"]).convert("RGB")
        rows.append(D.evaluate_image(img, r, models.detect(img)))
    agg = D.aggregate(rows)
    result = {"evidence_level": "EXPLORATORY", "detector_prompt": models.prompt,
              "box_threshold": 0.3, "text_threshold": 0.3, "iou_threshold": D.IOU_THRESHOLD,
              "n_records_in_manifest_after_filter": len(records),
              "n_annotated_original_photos": len(annotated), "aggregate": agg, "per_image": rows}

    diag = []
    if args.diagnostic_dir:
        cdir = out / "diagnostic_crops"
        cdir.mkdir(exist_ok=True)
        for p in sorted((ROOT / args.diagnostic_dir).resolve().glob("mock_*.jpg")):
            intended = p.stem.split("_")[1]
            img = Image.open(p).convert("RGB")
            dets = models.detect(img)
            crop, info = select_crop(img, dets)
            crop.save(cdir / p.name)
            diag.append({"image": str(p.relative_to(ROOT)), "intended_object": intended,
                         "intended_canonical": normalize_category(intended),
                         "selected": info.to_dict(),
                         "proposals": [{"label": d["label"], "score": round(d["score"], 3),
                                        "box": [round(v) for v in d["box"]]} for d in dets]})
        result["synthetic_diagnostic"] = {"evidence_level": "SYNTHETIC_QUALITATIVE", "images": diag}
    (out / "grounding_dino_eval.json").write_text(json.dumps(result, indent=1, default=str))

    print(json.dumps(agg, indent=1))
    for row in rows:
        s = row["selected"]
        print(f"  {row['record']:30s} sel={s['label']}@{s['score'] and round(s['score'],3)} IoU={s['iou']} "
              f"hit={row['proposal_hit']} cat_hit={row['correct_category_hit']} wrong_obj={row['wrong_object']}")
    for d in diag:
        s = d["selected"]
        print(f"  [synthetic] {d['intended_object']:11s} -> {s['source']}:{s['label']}@{s['score'] and round(s['score'],3)}")
    print("written:", out / "grounding_dino_eval.json")


if __name__ == "__main__":
    main()
