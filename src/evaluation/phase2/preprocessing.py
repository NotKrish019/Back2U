"""The four Phase 2 preprocessing conditions. Evaluation-only: production code is not modified.

A_full_image               full photo                     → production transform
B_detector_crop            production select_crop() box   → production transform
C_ground_truth_crop        verified GT box (same padding) → production transform   (oracle)
D_detector_crop_letterbox  production select_crop() box   → aspect-preserving letterbox

production transform = Resize(256, bicubic) → CenterCrop(224) → ImageNet normalise
                       (src/embeddings/dinov2_model.py, unchanged)
letterbox transform  = scale longest side to 224 (bicubic), pad to 224×224 with ImageNet-mean
                       colour, ImageNet normalise — the whole object is kept, nothing cropped.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Optional

from PIL import Image

from src.categories import DETECTOR_PHRASES
from src.inference.crop import select_crop

CONDITIONS = ("A_full_image", "B_detector_crop", "C_ground_truth_crop", "D_detector_crop_letterbox",
              # diagnostic: isolates the transform effect when inputs are already crops
              "A_full_image_letterbox")
NEEDS_DETECTOR = {"B_detector_crop", "D_detector_crop_letterbox"}
NEEDS_GT_BBOX = {"C_ground_truth_crop"}
TRANSFORM_PRODUCTION = "production_resize256_centercrop224"
TRANSFORM_LETTERBOX = "letterbox224_imagenet_mean_pad"
IMAGENET_MEAN_RGB = (124, 116, 104)


@dataclass
class Prepared:
    condition: str
    transform: str
    crop_source: str              # full_image | detector | full_image_fallback | ground_truth
    crop_box: list[int]
    crop_size: list[int]
    detector_box: Optional[list[float]]
    detector_label: Optional[str]
    detector_score: Optional[float]
    detector_reason: Optional[str]
    ground_truth_bbox: Optional[list[float]]

    def to_dict(self) -> dict:
        return asdict(self)


def letterbox(img: Image.Image, size: int = 224, fill=IMAGENET_MEAN_RGB) -> Image.Image:
    img = img.convert("RGB")
    w, h = img.size
    scale = size / max(w, h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    resized = img.resize((nw, nh), Image.BICUBIC)
    canvas = Image.new("RGB", (size, size), tuple(fill))
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2))
    return canvas


def prepare(img: Image.Image, condition: str, record: dict, detections: Optional[list[dict]]) -> tuple[Image.Image, Prepared]:
    """Return the image to hand to the encoder plus a full record of what was done."""
    if condition not in CONDITIONS:
        raise ValueError(f"unknown condition {condition!r}")
    gt = record.get("ground_truth_bbox")
    w, h = img.size

    if condition in ("A_full_image", "A_full_image_letterbox"):
        transform = TRANSFORM_LETTERBOX if condition.endswith("letterbox") else TRANSFORM_PRODUCTION
        return img, Prepared(condition, transform, "full_image", [0, 0, w, h], [w, h],
                             None, None, None, None, gt)

    if condition in NEEDS_DETECTOR:
        if detections is None:
            raise ValueError(f"{condition} requires detector output")
        crop, info = select_crop(img, detections)
        transform = TRANSFORM_LETTERBOX if condition == "D_detector_crop_letterbox" else TRANSFORM_PRODUCTION
        return crop, Prepared(condition, transform, info.source, info.box, list(crop.size),
                              info.raw_box, info.label, info.score, info.reason, gt)

    # C: ground-truth crop with exactly the production validation + 10% padding policy
    if gt is None:
        raise ValueError("C_ground_truth_crop requires ground_truth_bbox")
    phrase = DETECTOR_PHRASES[record["category"]]
    crop, info = select_crop(img, [{"label": phrase, "score": 1.0, "box": gt}])
    if info.source != "detector":
        raise ValueError(f"ground-truth bbox rejected by crop validation: {info.reason}")
    return crop, Prepared(condition, TRANSFORM_PRODUCTION, "ground_truth", info.box, list(crop.size),
                          None, None, None, None, gt)
