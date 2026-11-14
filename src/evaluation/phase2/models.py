"""Evaluation-side model access. Reuses production methods verbatim; production code is untouched.

Only Grounding DINO, DINOv2 and the M4-C projection head are loaded (no M2 / SigLIP2 / reranker,
and no GalleryStore — the production gallery is never opened or created).
"""
from __future__ import annotations

from types import SimpleNamespace

import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image

from src.categories import detector_prompt
from src.evaluation.phase2.preprocessing import TRANSFORM_LETTERBOX, TRANSFORM_PRODUCTION, letterbox
from src.inference import versioning as V

_LETTERBOX_TENSOR = T.Compose([T.ToTensor(), T.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))])


class EvalModels:
    def __init__(self, checkpoint: str, load_detector: bool = True):
        from scripts.run_inference import LiveModels  # production class; methods reused as-is
        from src.embeddings.dinov2_model import Dinov2ImageEncoder
        from src.models.m4_projection import M4ProjectionHead

        self._live = LiveModels
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.checkpoint = checkpoint
        self.checkpoint_sha256 = V.sha256_file(checkpoint)
        self.model_version = V.build_model_version(self.checkpoint_sha256)
        self.prompt = detector_prompt()

        enc = Dinov2ImageEncoder()
        for p in enc.model.parameters():
            p.requires_grad = False
        proj = M4ProjectionHead(384, 512, 256, 0.1).to(self.device)
        proj.load_state_dict(torch.load(checkpoint, map_location=self.device))
        proj.eval()
        self.ns = SimpleNamespace(device=self.device, m4c_encoder=enc, m4c_proj=proj)
        if load_detector:
            from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor
            self.ns.gdino_proc = AutoProcessor.from_pretrained(V.GDINO_MODEL_ID)
            self.ns.gdino = AutoModelForZeroShotObjectDetection.from_pretrained(V.GDINO_MODEL_ID).to(self.device)
            self.ns.gdino.eval()

    def detect(self, img: Image.Image) -> list[dict]:
        return self._live.detect(self.ns, img, self.prompt)

    def embed(self, img: Image.Image, transform: str) -> np.ndarray:
        if transform == TRANSFORM_PRODUCTION:
            return self._live.embed_visual(self.ns, img)  # production path, unchanged
        if transform == TRANSFORM_LETTERBOX:
            t = _LETTERBOX_TENSOR(letterbox(img)).unsqueeze(0).to(self.device)
            with torch.no_grad():
                cls = self.ns.m4c_encoder.model.forward_features(t)["x_norm_clstoken"]
                emb = self.ns.m4c_proj(cls)[0]
            return (emb / emb.norm(p=2, dim=-1)).cpu().numpy().astype(np.float32)
        raise ValueError(f"unknown transform {transform!r}")
