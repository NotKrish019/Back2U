"""Turn a Grounding DINO detection into a validated object crop.

The crop (not the full photograph) is what the M4-C retrieval embedder and the
SigLIP2 gallery image embedder should see, matching how M4-C was trained
(object crops, see scripts/preprocess_object_crops.py).
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


@dataclass
class CropInfo:
    source: str                      # "detector" | "full_image_fallback"
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


def select_crop(image: Image.Image, detections: Sequence[dict]) -> tuple[Image.Image, CropInfo]:
    """Pick the highest-scoring valid detection of a canonical category and crop to it.

    ``detections``: dicts with ``label`` (str), ``score`` (float), ``box`` ([x0,y0,x1,y1] px).
    Falls back to the full image (recorded in ``CropInfo.source``) if nothing is valid.
    """
    width, height = image.size
    rejected: list[str] = []
    for det in sorted(detections or [], key=lambda d: -float(d.get("score", 0.0))):
        canonical = normalize_detector_label(det.get("label"))
        if canonical is None:
            rejected.append("non_canonical_label")
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
            score=float(det.get("score", 0.0)),
            reason="highest_scoring_valid_detection",
            image_size=[width, height],
        )

    reason = "no_detections" if not detections else "no_valid_detection:" + ",".join(sorted(set(rejected)))
    return image, CropInfo(
        source="full_image_fallback",
        box=[0, 0, width, height],
        raw_box=None,
        label=None,
        raw_label=None,
        score=None,
        reason=reason,
        image_size=[width, height],
    )
