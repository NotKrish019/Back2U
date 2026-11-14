"""Lightweight stand-ins for LiveModels so the real pipeline code runs without checkpoints."""
import hashlib
import io
import threading

import numpy as np
import torch
from PIL import Image


def _unit(v: np.ndarray) -> np.ndarray:
    v = v.astype(np.float32).reshape(-1)
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


def make_image(size=(400, 300), bg=(255, 255, 255), box=None, color=(255, 0, 0), seed=None) -> Image.Image:
    """White canvas with an optional solid rectangle; ``seed`` adds deterministic noise."""
    if seed is not None:
        rng = np.random.default_rng(seed)
        arr = rng.integers(0, 255, size=(size[1], size[0], 3), dtype=np.uint8)
        img = Image.fromarray(arr, "RGB")
    else:
        img = Image.new("RGB", size, bg)
    if box is not None:
        img.paste(Image.new("RGB", (box[2] - box[0], box[3] - box[1]), color), (box[0], box[1]))
    return img


def to_jpeg_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")  # lossless so content hashes are stable
    return buf.getvalue()


class FakeModels:
    model_version = "fake-lp-riem-mm1-test"
    checkpoints = {"fake": {"sha256": "0" * 64}}
    idx_to_cat = {"0": "laptop", "1": "Laptop"}
    reranker = None

    def __init__(self, detections=None, detect_fn=None):
        self._detections = detections or []
        self._detect_fn = detect_fn
        self.lock = threading.Lock()
        self.visual_inputs: list[Image.Image] = []
        self.siglip_image_inputs: list[Image.Image] = []
        self.detect_prompts: list[str] = []

    def detect(self, pil, prompt):
        with self.lock:
            self.detect_prompts.append(prompt)
        if self._detect_fn is not None:
            return self._detect_fn(pil)
        return [dict(d) for d in self._detections]

    def classify_probs(self, pil):
        return torch.tensor([0.55, 0.45])

    def embed_visual(self, pil):
        with self.lock:
            self.visual_inputs.append(pil.copy())
        small = np.asarray(pil.convert("L").resize((16, 16)), dtype=np.float32) + 1.0
        return _unit(small)  # 256-d, content dependent

    def embed_siglip_image(self, pil):
        with self.lock:
            self.siglip_image_inputs.append(pil.copy())
        small = np.asarray(pil.convert("RGB").resize((16, 16)), dtype=np.float32) + 1.0
        return _unit(small)  # 768-d

    def embed_siglip_text(self, text, pil):
        seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
        return _unit(np.random.default_rng(seed).normal(size=768))
