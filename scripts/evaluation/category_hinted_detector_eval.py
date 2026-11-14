"""Phase 2C Task 3: does a category hint improve Grounding DINO proposal selection? (evaluation only)

  A  current 7-category prompt + production select_crop                       (deployable, = production)
  B  single-category prompt "<gt phrase>." + production select_crop           (ORACLE: ground-truth category)
  C  A's proposals filtered to the ground-truth category, then select_crop    (ORACLE here; deployable
                                                                              only if a trusted category
                                                                              is supplied, e.g. by the user)
Ground truth: CO3D mask boxes (853 frames) and the 4 Phase-2 app photos (assistant-verified boxes).
The broken M2 classifier is not used. Detector thresholds are the production ones (0.3 / 0.3).

    python scripts/evaluation/category_hinted_detector_eval.py
"""
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "True")

OUT = ROOT / "reports/evaluation/phase2_runs/category_hinted_detector"
SETS = {
    "co3d_pilot": ("data/processed/co3d_phase2_pilot_manifest.jsonl", "reports/evaluation/phase2_runs/co3d_pilot/detections.json"),
    "app_photos_exploratory": ("data/processed/phase2_evaluation_manifest.jsonl", None),
}
THR = 0.5


def score(img, rec, dets, filter_cat=None):
    from src.categories import normalize_detector_label
    from src.evaluation.phase2.detector_eval import iou
    from src.inference.crop import select_crop
    gt, cat = rec["ground_truth_bbox"], rec["category"]
    if filter_cat:
        dets = [d for d in dets if normalize_detector_label(d["label"]) == filter_cat]
    _, info = select_crop(img, dets)
    hit_any = any(iou(d["box"], gt) >= THR for d in dets)
    sel_iou = iou(info.raw_box, gt) if info.source == "detector" else 0.0
    return {"n_proposals": len(dets), "proposal_hit": hit_any, "no_proposal": info.source != "detector",
            "selected_iou": round(sel_iou, 4), "selected_label": info.label,
            "selected_category_correct": info.source == "detector" and info.label == cat,
            "selected_box_correct": sel_iou >= THR,
            "wrong_object": info.source == "detector" and sel_iou < THR and hit_any}


def agg(rows):
    n = len(rows)
    f = lambda k: round(sum(bool(r[k]) for r in rows) / n, 4)
    ious = [r["selected_iou"] for r in rows if not r["no_proposal"]]
    return {"n": n, "proposal_recall_iou0.5": f("proposal_hit"), "selected_category_correct": f("selected_category_correct"),
            "selected_box_iou>=0.5": f("selected_box_correct"), "mean_selected_iou": round(sum(ious) / len(ious), 4) if ious else None,
            "wrong_object_selection": f("wrong_object"), "no_proposal_rate": f("no_proposal")}


def main():
    os.chdir(ROOT)
    from scripts.run_inference import LiveModels
    from src.categories import DETECTOR_PHRASES
    from src.evaluation.phase2.models import EvalModels
    m = EvalModels(str(ROOT / "models/checkpoints/m4_c/best_val_recall_at_1.pt"), load_detector=True)
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"iou_threshold": THR, "prompt_A": m.prompt, "sets": {}}
    for name, (man, cached) in SETS.items():
        recs = [json.loads(l) for l in open(ROOT / man) if l.strip()]
        recs = [r for r in recs if r.get("ground_truth_bbox") and r.get("image_kind", "original_photo") == "original_photo"]
        cache = json.load(open(ROOT / cached)) if cached else {}
        rows = defaultdict(lambda: defaultdict(list))
        per_image = []
        for i, r in enumerate(recs):
            key = f"{r['physical_instance_id']}/{r['view_id']}"
            img = Image.open(ROOT / r["image_path"]).convert("RGB")
            dA = cache.get(key) or m.detect(img)
            dB = LiveModels.detect(m.ns, img, DETECTOR_PHRASES[r["category"]] + ".")
            res = {"A_seven_category_prompt": score(img, r, dA),
                   "B_single_category_prompt_ORACLE": score(img, r, dB),
                   "C_filter_A_to_category_ORACLE": score(img, r, dA, filter_cat=r["category"])}
            for v, s in res.items():
                rows[v]["ALL"].append(s)
                rows[v][r["category"]].append(s)
            per_image.append({"record": key, "category": r["category"], **res})
            if i % 100 == 0:
                print(f"[{name}] {i}/{len(recs)}", flush=True)
        report["sets"][name] = {v: {c: agg(rs) for c, rs in d.items()} for v, d in rows.items()}
        (OUT / f"{name}_per_image.jsonl").write_text("".join(json.dumps(x) + "\n" for x in per_image))
        for v, d in report["sets"][name].items():
            print(name, v, json.dumps(d["ALL"]))
            for c, a in d.items():
                if c != "ALL":
                    print("    ", c, json.dumps(a))
    (OUT / "summary.json").write_text(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
