"""Grounding DINO evaluation against manually verified category + box annotations.

Per image (one annotated target object):
  proposal_hit          any proposal (any label) with IoU >= thr          → object proposal recall
  correct_category_hit  any proposal with IoU >= thr AND canonical label == GT category
  selected              the box production select_crop() would use
  selected_correct      selected IoU >= thr AND selected label == GT category
  wrong_category        selected IoU >= thr but label != GT category        (right object, wrong name)
  wrong_object          selected IoU <  thr although some proposal had IoU >= thr
                        (multiple-object selection error: the right box existed, another was chosen)
  missed                no proposal reaches IoU >= thr
Detector scores are reported as raw zero-shot scores, NOT calibrated probabilities.
"""
from __future__ import annotations

from typing import Optional

from PIL import Image

from src.categories import normalize_detector_label
from src.inference.crop import select_crop

IOU_THRESHOLD = 0.5


def iou(a, b) -> float:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    iw = max(0.0, min(ax1, bx1) - max(ax0, bx0))
    ih = max(0.0, min(ay1, by1) - max(ay0, by0))
    inter = iw * ih
    union = (ax1 - ax0) * (ay1 - ay0) + (bx1 - bx0) * (by1 - by0) - inter
    return inter / union if union > 0 else 0.0


def evaluate_image(img: Image.Image, record: dict, detections: list[dict], thr: float = IOU_THRESHOLD) -> dict:
    gt, cat = record["ground_truth_bbox"], record["category"]
    props = []
    for d in detections:
        props.append({"label": d["label"], "canonical": normalize_detector_label(d["label"]),
                      "score": round(float(d["score"]), 4), "box": [round(v, 1) for v in d["box"]],
                      "iou": round(iou(d["box"], gt), 4)})
    hits = [p for p in props if p["iou"] >= thr]
    _, info = select_crop(img, detections)
    sel_iou = iou(info.raw_box, gt) if info.raw_box else 0.0
    selected_ok = info.source == "detector" and sel_iou >= thr
    return {
        "record": f"{record['physical_instance_id']}/{record['view_id']}",
        "category": cat,
        "n_proposals": len(props),
        "proposals": props,
        "best_iou_any": max((p["iou"] for p in props), default=0.0),
        "proposal_hit": bool(hits),
        "correct_category_hit": any(p["canonical"] == cat for p in hits),
        "incorrect_category_proposals": sum(1 for p in props if p["canonical"] not in (None, cat)),
        "selected": {"source": info.source, "label": info.label, "score": info.score,
                     "box": info.raw_box, "iou": round(sel_iou, 4), "reason": info.reason},
        "selected_correct": selected_ok and info.label == cat,
        "wrong_category": selected_ok and info.label != cat,
        "wrong_object": (not selected_ok) and bool(hits),
        "missed": not hits,
    }


def aggregate(rows: list[dict]) -> dict:
    n = len(rows)
    if n == 0:
        return {"n_images": 0}
    mean = lambda key: round(sum(1 for r in rows if r[key]) / n, 4)
    total_props = sum(r["n_proposals"] for r in rows)
    sel_ious = [r["selected"]["iou"] for r in rows if r["selected"]["source"] == "detector"]
    return {
        "n_images": n,
        "iou_threshold": IOU_THRESHOLD,
        "object_proposal_recall": mean("proposal_hit"),
        "correct_category_proposal_rate": mean("correct_category_hit"),
        "selected_correct_rate": mean("selected_correct"),
        "incorrect_category_proposal_fraction": round(
            sum(r["incorrect_category_proposals"] for r in rows) / total_props, 4) if total_props else None,
        "missed_object_rate": mean("missed"),
        "wrong_category_selection_rate": mean("wrong_category"),
        "multiple_object_selection_error_rate": mean("wrong_object"),
        "mean_selected_iou": round(sum(sel_ious) / len(sel_ious), 4) if sel_ious else None,
        "mean_best_iou_any": round(sum(r["best_iou_any"] for r in rows) / n, 4),
        "full_image_fallbacks": sum(1 for r in rows if r["selected"]["source"] != "detector"),
    }
