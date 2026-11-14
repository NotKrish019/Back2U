"""Single source of truth for the live model version and checkpoint identities."""
from __future__ import annotations

import hashlib
from pathlib import Path

MODEL_NAME = "lp-riem-mm1"
# Bump whenever preprocessing changes the stored embeddings (e.g. crop policy).
PIPELINE_REVISION = "phase1-crop-v1"

M2_CHECKPOINT = "models/checkpoints/m2_category_head_best.pth"
M2_CATEGORIES = "data/processed/m2_categories.json"
M4C_CHECKPOINT = "models/checkpoints/m4_c/best_val_recall_at_1.pt"
RERANKER_CHECKPOINT = "models/reranker_calibration.pkl"
GDINO_MODEL_ID = "IDEA-Research/grounding-dino-tiny"
SIGLIP_MODEL_ID = "google/siglip2-base-patch16-224"
DINOV2_HUB_ID = "facebookresearch/dinov2:dinov2_vits14"

VISUAL_DIM = 256   # M4-C projection output
SIGLIP_DIM = 768   # SigLIP2 base image/text embedding


def sha256_file(path: str | Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def build_model_version(m4c_sha256: str) -> str:
    """e.g. ``lp-riem-mm1-phase1-crop-v1+m4c.1a2b3c4d``"""
    return f"{MODEL_NAME}-{PIPELINE_REVISION}+m4c.{m4c_sha256[:8]}"
