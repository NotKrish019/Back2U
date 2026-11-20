"""Turn a Grounding DINO detection into a validated object crop.

The crop (not the full photograph) is what the M4-C retrieval embedder and the
SigLIP2 gallery image embedder should see, matching how M4-C was trained
(object crops, see scripts/datasets/preprocess_object_crops.py).
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Optional, Sequence

from PIL import Image

from src.categories import normalize_detector_label

# Validation limits. These are crop-sanity limits, not open-set thresholds.
MIN_CROP_SIDE_PX = 32          # smaller boxes have too few pixels for ViT-S/14 @224
MIN_CROP_AREA_FRAC = 0.01      # box must cover >= 1% of the image
PAD_FRAC = 0.10                # context padding on each side, relative to box size
DEFAULT_MIN_CONFIDENCE = 0.4   # minimum detection confidence for confidence_aware cropping


@dataclass
class CropInfo:
    source: str                      # "full_image" | "detector" | "full_image_fallback"
    box: list[int]                   # [x0, y0, x1, y1] actually cropped, pixel coords
    raw_box: Optional[list[float]]   # detector box before clamping/padding
    label: Optional[str]             # canonical category of the selected detection
    raw_label: Optional[str]
    score: Optional[float]
    reason: str                      # why this source was chosen
    image_size: list[int]            # [W, H] of the original image

    def to_dict(self) -> dict:
        return asdict(self)


def _validate_box(box: Sequence[float], width: int, height: int) -> tuple[Optional[list[int]], str]:
    if box is None or len(box) != 4:
        return None, "malformed_box"
    try:
        x0, y0, x1, y1 = (float(v) for v in box)
    except (TypeError, ValueError):
        return None, "malformed_box"
    if any(v != v for v in (x0, y0, x1, y1)):  # NaN
        return None, "nan_box"
    if x1 <= x0 or y1 <= y0:
        return None, "degenerate_box"
    # clamp to image
    x0, x1 = max(0.0, x0), min(float(width), x1)
    y0, y1 = max(0.0, y0), min(float(height), y1)
    if x1 <= x0 or y1 <= y0:
        return None, "box_outside_image"
    bw, bh = x1 - x0, y1 - y0
    if bw < MIN_CROP_SIDE_PX or bh < MIN_CROP_SIDE_PX:
        return None, "box_too_small"
    if (bw * bh) / float(width * height) < MIN_CROP_AREA_FRAC:
        return None, "box_area_too_small"
    # pad for context, then clamp again
    px, py = bw * PAD_FRAC, bh * PAD_FRAC
    out = [
        int(max(0, round(x0 - px))),
        int(max(0, round(y0 - py))),
        int(min(width, round(x1 + px))),
        int(min(height, round(y1 + py))),
    ]
    return out, "ok"


def select_crop(
    image: Image.Image,
    detections: Sequence[dict],
    policy: str = "detector_crop",
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    expected_category: Optional[str] = None,
) -> tuple[Image.Image, CropInfo]:
    """Select crop or full image based on cropping policy.

    Policies:
    - "full_image": Production default; preserves full image context and avoids clipping
      extremities or stickers. Still attaches detection metadata to CropInfo.
    - "confidence_aware": Only crops if detector score >= min_confidence, valid box, and
      matches expected_category if provided; otherwise falls back safely to full image.
    - "detector_crop": Legacy mode; crops to highest scoring valid canonical detection.

    ``detections``: dicts with ``label`` (str), ``score`` (float), ``box`` ([x0,y0,x1,y1] px).
    """
    width, height = image.size

    # Extract best canonical detection for metadata
    best_det = None
    for det in sorted(detections or [], key=lambda d: -float(d.get("score", 0.0))):
        canonical = normalize_detector_label(det.get("label"))
        if canonical is not None:
            box, why = _validate_box(det.get("box"), width, height)
            if box is not None:
                best_det = (det, canonical, box)
                break

    if policy == "full_image":
        if best_det is not None:
            return image, CropInfo(
                source="full_image",
                box=[0, 0, width, height],
                raw_box=[float(v) for v in best_det[0]["box"]],
                label=best_det[1],
                raw_label=best_det[0].get("label"),
                score=float(best_det[0].get("score", 0.0)),
                reason="full_image_policy",
                image_size=[width, height],
            )
        else:
            return image, CropInfo(
                source="full_image_fallback",
                box=[0, 0, width, height],
                raw_box=None,
                label=None,
                raw_label=None,
                score=None,
                reason="no_detections" if not detections else "no_valid_detection",
                image_size=[width, height],
            )

    rejected: list[str] = []
    for det in sorted(detections or [], key=lambda d: -float(d.get("score", 0.0))):
        canonical = normalize_detector_label(det.get("label"))
        if canonical is None:
            rejected.append("non_canonical_label")
            continue
        score = float(det.get("score", 0.0))
        if policy == "confidence_aware" and score < min_confidence:
            rejected.append(f"low_confidence_{score:.2f}<{min_confidence}")
            continue
        if expected_category and canonical != expected_category:
            rejected.append(f"category_mismatch_{canonical}!={expected_category}")
            continue
        box, why = _validate_box(det.get("box"), width, height)
        if box is None:
            rejected.append(why)
            continue
        crop = image.crop(tuple(box))
        return crop, CropInfo(
            source="detector",
            box=box,
            raw_box=[float(v) for v in det["box"]],
            label=canonical,
            raw_label=det.get("label"),
            score=score,
            reason="confidence_aware_crop" if policy == "confidence_aware" else "highest_scoring_valid_detection",
            image_size=[width, height],
        )

    reason = "no_detections" if not detections else "no_valid_detection:" + ",".join(sorted(set(rejected)))
    return image, CropInfo(
        source="full_image_fallback",
        box=[0, 0, width, height],
        raw_box=[float(v) for v in best_det[0]["box"]] if best_det else None,
        label=best_det[1] if best_det else None,
        raw_label=best_det[0].get("label") if best_det else None,
        score=float(best_det[0].get("score", 0.0)) if best_det else None,
        reason=reason,
        image_size=[width, height],
    )
