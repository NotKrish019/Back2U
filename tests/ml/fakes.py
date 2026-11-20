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

    # Open-set gate. Default: every image looks like a confident laptop. Tests override
    # ``gate_label`` ("laptop", "backpack", ...) or ``gate_cos`` (full per-prompt vector).
    gate_label = "laptop"
    gate_cos = None

    @property
    def gate_labels(self):
        from src.inference.open_set import prompt_table
        return prompt_table()[1]

    def gate_cosines(self, siglip_image_emb):
        if self.gate_cos is not None:
            return np.asarray(self.gate_cos, dtype=np.float32)
        return np.asarray([0.20 if l == self.gate_label else 0.02 for l in self.gate_labels], dtype=np.float32)

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


class CosineReranker:
    """Deterministic stand-in for the sklearn reranker: P(match) = SigLIP cosine (clipped)."""

    def predict_proba(self, rows):
        out = []
        for s_sim, *_ in rows:
            p = float(min(1.0, max(0.0, s_sim)))
            out.append([1.0 - p, p])
        return np.asarray(out)
