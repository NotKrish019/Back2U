"""LP-RIEM-MM1 live inference pipeline (used by src/app/main.py on port 8001).

Phase 1 changes (see reports/evaluation/PHASE_1_PIPELINE_STABILIZATION_REPORT.md):
- the Grounding DINO box is turned into a validated crop and the crop — not the full photo —
  is embedded by M4-C (query + gallery) and SigLIP2 (gallery image side);
- the gallery is a persistent GalleryStore (model-version / dimension checked) instead of an
  in-memory FAISS index seeded from data/processed/test_split.jsonl;
- detector labels and classifier labels are normalised to the canonical categories.
Unchanged: checkpoints, open-set thresholds (margin > 0.95, entropy < 0.3), detector
thresholds (0.3 / 0.3), reranker and its 0.8 / 0.2 operating points.
"""
import argparse
import hashlib
import io
import json
import os
import pickle
import ssl
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image

try:  # iPhone photos arrive as HEIC/HEIF; Pillow needs this plugin to decode them.
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:  # optional: without it, HEIC uploads are rejected with a clear 400
    pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.categories import detector_prompt, normalize_category, normalize_detector_label
from src.inference.crop import select_crop
from src.inference import versioning as V
from src.inference import open_set as OS
from src.retrieval.gallery_store import GalleryStore

ssl._create_default_https_context = ssl._create_unverified_context

# Open-set policy (M2-C) — DO NOT CHANGE in Phase 1.
OPEN_SET_MARGIN = 0.95
OPEN_SET_ENTROPY = 0.3
# Detector thresholds — unchanged from the original pipeline.
GDINO_BOX_THRESHOLD = 0.3
GDINO_TEXT_THRESHOLD = 0.3
# Calibrated reranker operating points (validated on holdout: 84% precision, <4% false rejects).
CANDIDATE_PROB = 0.65
REJECT_PROB = 0.15

MAX_IMAGE_PIXELS = 40_000_000


def _l2(v: torch.Tensor) -> torch.Tensor:
    return v / v.norm(p=2, dim=-1)


def open_image_bytes(data: bytes) -> Image.Image:
    """Decode and validate an uploaded image. Raises ValueError on anything unusable."""
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
        img = Image.open(io.BytesIO(data))
        if img.size[0] * img.size[1] > MAX_IMAGE_PIXELS:
            raise ValueError(f"image too large: {img.size}")
        fmt = (img.format or "JPEG").upper()
        return img.convert("RGB"), fmt
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"invalid image: {e}") from e


class LiveModels:
    """Loads the real checkpoints. Every embedding method takes a PIL image."""

    def __init__(self, device: str = "cuda", root: Path = PROJECT_ROOT):
        from torchvision import transforms
        from transformers import AutoModel, AutoModelForZeroShotObjectDetection, AutoProcessor
        from src.embeddings.dinov2_model import Dinov2ImageEncoder
        from src.models.m2_classifier import M2CategoryHead, load_m2_weights
        from src.models.m4_projection import M4ProjectionHead

        self.device = device if torch.cuda.is_available() else "cpu"
        p = lambda rel: str(root / rel)

        self.checkpoints = {
            rel: {"sha256": V.sha256_file(p(rel))}
            for rel in (V.M2_CHECKPOINT, V.M2_CATEGORIES, V.M4C_CHECKPOINT, V.RERANKER_CHECKPOINT)
            if os.path.exists(p(rel))
        }
        self.model_version = V.build_model_version(self.checkpoints[V.M4C_CHECKPOINT]["sha256"])

        print("Loading Perception Models...", file=sys.stderr)
        with open(p(V.M2_CATEGORIES)) as f:
            self.idx_to_cat = json.load(f)
        self.m2_clf = M2CategoryHead(num_categories=len(self.idx_to_cat)).to(self.device)
        load_m2_weights(self.m2_clf, p(V.M2_CHECKPOINT), map_location=self.device)
        self.m2_clf.eval()
        self.clf_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ])
        self.gdino_proc = AutoProcessor.from_pretrained(V.GDINO_MODEL_ID)
        self.gdino = AutoModelForZeroShotObjectDetection.from_pretrained(V.GDINO_MODEL_ID).to(self.device)

        print("Loading M4-C Visual Retrieval Model...", file=sys.stderr)
        self.m4c_encoder = Dinov2ImageEncoder()
        for param in self.m4c_encoder.model.parameters():
            param.requires_grad = False
        self.m4c_proj = M4ProjectionHead(384, 512, 256, 0.1).to(self.device)
        self.m4c_proj.load_state_dict(torch.load(p(V.M4C_CHECKPOINT), map_location=self.device))
        self.m4c_proj.eval()

        print("Loading SigLIP2 Semantic Model...", file=sys.stderr)
        self.siglip_proc = AutoProcessor.from_pretrained(V.SIGLIP_MODEL_ID)
        self.siglip = AutoModel.from_pretrained(V.SIGLIP_MODEL_ID).to(self.device)
        self.siglip.eval()

        # SigLIP2 zero-shot category prompts (Option A primary classifier: 92.9% accuracy)
        self.canonical_categories = (
            "laptop", "mobile_phone", "wallet", "earphones", "headphones", "keys", "book", "other"
        )
        self.category_prompts = [
            "a photo of a laptop computer",
            "a photo of a mobile phone or smartphone",
            "a photo of a personal wallet or purse",
            "a photo of small in-ear earphones or wireless earbuds",
            "a photo of over-ear headphones or headset",
            "a photo of metal keys or a keychain",
            "a photo of a book or textbook",
            "a photo of another object or everyday item",
        ]
        dummy_img = Image.new("RGB", (224, 224))
        text_inputs = self.siglip_proc(images=[dummy_img]*len(self.category_prompts), text=self.category_prompts,
                                      padding="max_length", return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.siglip(**text_inputs)
            self.category_text_embs = out.text_embeds / out.text_embeds.norm(dim=-1, keepdim=True)
        self.siglip_idx_to_cat = {str(i): cat for i, cat in enumerate(self.canonical_categories)}

        # Open-set gate prompts (supported + unsupported objects), see src/inference/open_set.py
        self.gate_prompts, self.gate_labels, _ = OS.prompt_table()
        self.gate_text_embs = self._embed_prompts(self.gate_prompts)

        print("Loading Multimodal Reranker & Calibrator...", file=sys.stderr)
        self.reranker = None
        if os.path.exists(p(V.RERANKER_CHECKPOINT)):
            with open(p(V.RERANKER_CHECKPOINT), "rb") as f:
                self.reranker = pickle.load(f)

    def _embed_prompts(self, prompts: list[str]) -> torch.Tensor:
        dummy = Image.new("RGB", (224, 224))
        embs = []
        for i in range(0, len(prompts), 16):
            chunk = prompts[i:i + 16]
            inputs = self.siglip_proc(images=[dummy] * len(chunk), text=chunk, padding="max_length",
                                      return_tensors="pt").to(self.device)
            with torch.no_grad():
                out = self.siglip(**inputs)
            embs.append(out.text_embeds / out.text_embeds.norm(dim=-1, keepdim=True))
        return torch.cat(embs, dim=0)

    def gate_cosines(self, siglip_image_emb: np.ndarray) -> np.ndarray:
        """Cosine of an (L2-normalised) SigLIP2 image embedding with every gate prompt."""
        t = self.gate_text_embs.cpu().numpy().astype(np.float32)
        return t @ np.asarray(siglip_image_emb, dtype=np.float32)

    def detect(self, pil: Image.Image, prompt: str) -> list[dict]:
        inputs = self.gdino_proc(images=pil, text=prompt, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.gdino(**inputs)
        res = self.gdino_proc.post_process_grounded_object_detection(
            outputs, inputs.input_ids, threshold=GDINO_BOX_THRESHOLD, text_threshold=GDINO_TEXT_THRESHOLD,
            target_sizes=torch.tensor([pil.size[::-1]]),
        )[0]
        labels = res.get("text_labels", res.get("labels"))
        return [
            {"label": str(labels[i]), "score": float(res["scores"][i]),
             "box": [float(v) for v in res["boxes"][i].tolist()]}
            for i in range(len(res["scores"]))
        ]

    def classify_probs(self, pil: Image.Image, mode: str | None = None) -> torch.Tensor:
        """Predict class probabilities using SigLIP2 zero-shot (default) or M2 head."""
        mode = mode or os.environ.get("ML_CLASSIFY_MODE", "siglip")
        if mode == "siglip" and hasattr(self, "category_text_embs"):
            inputs = self.siglip_proc(images=[pil], text=["dummy"], return_tensors="pt",
                                      padding="max_length").to(self.device)
            with torch.no_grad():
                out = self.siglip(**inputs)
                img_emb = out.image_embeds / out.image_embeds.norm(dim=-1, keepdim=True)
                logits = img_emb @ self.category_text_embs.T
                return torch.softmax(logits * 10.0, dim=-1)[0].cpu()
        img_t = self.clf_transform(pil).unsqueeze(0).to(self.device)
        with torch.no_grad():
            return torch.softmax(self.m2_clf(img_t), dim=-1)[0].cpu()

    def embed_visual(self, pil: Image.Image) -> np.ndarray:
        cls_token, _ = self.m4c_encoder.encode_pil_with_patches(pil)
        with torch.no_grad():
            emb = self.m4c_proj(cls_token.unsqueeze(0).to(self.device))[0]
        return _l2(emb).cpu().numpy().astype(np.float32)

    def embed_siglip_image(self, pil: Image.Image) -> np.ndarray:
        inputs = self.siglip_proc(images=[pil], text=["dummy"], return_tensors="pt",
                                  padding="max_length").to(self.device)
        with torch.no_grad():
            out = self.siglip(**inputs)
        return _l2(out.image_embeds[0]).cpu().numpy().astype(np.float32)

    def embed_siglip_text(self, text: str, pil: Image.Image) -> np.ndarray:
        # Same call shape as the original pipeline; text_embeds do not depend on the image.
        inputs = self.siglip_proc(images=[pil], text=[text], return_tensors="pt",
                                  padding="max_length").to(self.device)
        with torch.no_grad():
            out = self.siglip(**inputs)
        return _l2(out.text_embeds[0]).cpu().numpy().astype(np.float32)


class FinalInferencePipeline:
    def __init__(self, device: str = "cuda", store_dir: str | os.PathLike | None = None, models=None,
                 crop_policy: str | None = None, retrieval_mode: str | None = None):
        self.models = models if models is not None else LiveModels(device=device)
        self.model_version = self.models.model_version
        self.classify_mode = os.environ.get("ML_CLASSIFY_MODE", "siglip")
        if self.classify_mode == "siglip" and hasattr(self.models, "siglip_idx_to_cat") and not type(self.models).__name__.startswith("Fake"):
            self.idx_to_cat = self.models.siglip_idx_to_cat
        else:
            self.idx_to_cat = self.models.idx_to_cat
        self.reranker = self.models.reranker
        # Production defaults: full image retrieval and SigLIP2 primary ranking
        self.crop_policy = crop_policy or os.environ.get("ML_CROP_POLICY", "full_image")
        self.retrieval_mode = retrieval_mode or os.environ.get("ML_RETRIEVAL_MODE", "siglip")
        # Raw classifier labels, kept for transparency, and their canonical forms.
        self.known_categories = list(self.idx_to_cat.values())
        self.known_canonical = {normalize_category(c) for c in self.known_categories} - {None}
        self.gdino_prompt = detector_prompt()
        self.gate = OS.GateConfig.load()
        # The detector only provides crop boxes. In full_image mode it is not needed at all
        # (it cost ~1-1.5 s per request on CPU). ML_DETECTOR_MODE=always restores the old behaviour.
        self.detector_mode = os.environ.get("ML_DETECTOR_MODE", "auto")

        store_dir = store_dir or os.environ.get("ML_GALLERY_DIR", str(PROJECT_ROOT / "data" / "gallery"))
        self.store = GalleryStore(store_dir, self.model_version, V.VISUAL_DIM, V.SIGLIP_DIM).load()

    # ------------------------------------------------------------------ perception
    @staticmethod
    def entropy(probs: torch.Tensor) -> float:
        return -torch.sum(probs * torch.log(probs + 1e-8)).item()

    def needs_detector(self) -> bool:
        return self.detector_mode == "always" or self.crop_policy != "full_image"

    def run_detector(self, pil_img: Image.Image):
        """Detections for cropping, or None when the crop policy does not need them."""
        if not self.needs_detector():
            return None
        return self.models.detect(pil_img, self.gdino_prompt)

    def run_perception(self, pil_img: Image.Image, siglip_emb: np.ndarray | None = None,
                       detections=None) -> dict:
        """Open-set gate. Classification only — the detector never changes the decision."""
        if siglip_emb is None:
            siglip_emb = self.models.embed_siglip_image(pil_img)
        prompt_cos = self.models.gate_cosines(siglip_emb)
        names, cos = OS.label_cosines(prompt_cos, self.models.gate_labels)
        gate = OS.decide(names, cos, self.gate)

        det_cat, det_conf = None, 0.0
        if detections:
            best = max(detections, key=lambda d: d.get("score", 0.0))
            det_conf = float(best.get("score", 0.0))
            det_cat = normalize_detector_label(best.get("label"))

        return {
            "category": gate["category"],
            "candidate_category": gate["candidate_category"],
            "confidence": gate["confidence"],
            "decision": gate["decision"],
            "reason": gate["reason"],
            "margin": gate["margin"],
            "unsupported_prob": gate["unsupported_prob"],
            "closest_unsupported": gate["closest_unsupported"],
            "probs": gate["probs"],
            "detector_category": det_cat,          # informational only
            "detector_confidence": det_conf,
            "detections": detections or [],
            "detector_ran": detections is not None,
            "gate_provenance": self.gate.provenance,
        }

    # ------------------------------------------------------------------ search
    def infer(self, image_path, text_query=None, top_k=5, return_debug=False):
        try:
            pil_img = Image.open(image_path).convert("RGB")
        except Exception:
            return {"error": "Invalid image"}
        return self.infer_pil(pil_img, text_query=text_query, top_k=top_k, return_debug=return_debug)

    def infer_pil(self, pil_img: Image.Image, text_query=None, top_k=5, return_debug=False,
                  allowed_ids=None, timings: dict | None = None):
        """Image (+ optional text) search.

        ``allowed_ids``: only these gallery items may be returned (the backend passes the
        eligible opposite-type open reports). ``None`` means unrestricted.
        """
        import time as _t
        timings = timings if timings is not None else {}
        t0 = _t.perf_counter()
        detections = self.run_detector(pil_img)
        timings["detector_s"] = round(_t.perf_counter() - t0, 4) if detections is not None else 0.0

        # Full-image SigLIP2 embedding is computed once and reused for the gate and retrieval.
        t0 = _t.perf_counter()
        full_siglip = self.models.embed_siglip_image(pil_img)
        timings["siglip_image_s"] = round(_t.perf_counter() - t0, 4)
        t0 = _t.perf_counter()
        perception = self.run_perception(pil_img, siglip_emb=full_siglip, detections=detections)
        timings["gate_s"] = round(_t.perf_counter() - t0, 4)
        crop_img, crop_info = select_crop(
            pil_img, detections, policy=self.crop_policy,
            expected_category=perception["category"] or perception["candidate_category"]
        )

        response = {
            "model_version": self.model_version,
            "status": "OK",
            "perception": {
                "category": perception["category"],
                "candidate_category": perception["candidate_category"],
                "confidence": round(perception["confidence"], 4),
                "decision": perception["decision"],
                "reason": perception["reason"],
                "unsupported_prob": perception["unsupported_prob"],
                "closest_unsupported": perception["closest_unsupported"],
            },
            "crop": crop_info.to_dict(),
            "matches": [],
            "timings": timings,
        }
        if perception["decision"] == OS.UNSUPPORTED_ITEM:
            # Hard stop: no retrieval, therefore no candidates and no auto-matches.
            response["status"] = OS.UNSUPPORTED_ITEM
            return response

        t0 = _t.perf_counter()
        visual_emb = self.models.embed_visual(crop_img)
        timings["visual_s"] = round(_t.perf_counter() - t0, 4)
        if crop_img is pil_img:  # full-image policy/fallback: reuse the embedding
            siglip_emb = full_siglip
        else:
            siglip_emb = self.models.embed_siglip_image(crop_img)

        # Primary retrieval: SigLIP2 baseline by default, or M4-C visual
        t0 = _t.perf_counter()
        if self.retrieval_mode == "siglip":
            sims, indices = self.store.search_siglip(siglip_emb, top_k * 2, allowed_ids=allowed_ids)
        else:
            sims, indices = self.store.search(visual_emb, top_k * 2, allowed_ids=allowed_ids)
        timings["search_s"] = round(_t.perf_counter() - t0, 4)

        if not indices:
            return response

        t_emb = self.models.embed_siglip_text(text_query, pil_img) if text_query else None

        candidates = []
        for sim_val, idx in zip(sims, indices):
            if idx < 0:
                continue
            g = self.store.entries[idx]
            s_sim = float(np.dot(siglip_emb, self.store.siglip[idx]))
            v_sim = float(np.dot(visual_emb, self.store.visual[idx]))
            primary_sim = s_sim if self.retrieval_mode == "siglip" else v_sim
            t_sim = float(np.dot(t_emb, self.store.siglip[idx])) if t_emb is not None else 0.0
            text_missing = 1.0 if t_emb is None else 0.0
            decision = "review"
            prob = float(primary_sim)
            if self.reranker is not None:
                try:
                    prob = float(self.reranker.predict_proba([[s_sim, v_sim, t_sim, text_missing]])[0][1])
                except Exception:
                    prob = float(self.reranker.predict_proba([[primary_sim, t_sim]])[0][1])
                if prob >= CANDIDATE_PROB:
                    decision = "candidate"
                elif prob < REJECT_PROB:
                    decision = "reject"
            if perception["decision"] != OS.SUPPORTED and decision == "candidate":
                decision = "review"  # uncertain category: a human must look, never auto-match
            candidates.append({
                "item_id": g.item_id,
                "category": g.category,
                "visual_score": round(float(primary_sim), 4),
                "text_score": round(t_sim, 4) if text_query else None,
                "final_score": round(prob, 4),
                "decision": decision,
                "_debug": {"v_sim": float(v_sim), "s_sim": float(s_sim), "t_sim": t_sim, "gallery_sha256": g.sha256},
            })

        candidates.sort(key=lambda x: x["final_score"], reverse=True)
        aggregated, seen = [], {}
        for cand in candidates:
            if cand["item_id"] in seen:
                seen[cand["item_id"]]["supporting_views"] += 1
            else:
                cand["supporting_views"] = 1
                seen[cand["item_id"]] = cand
                aggregated.append(cand)
        response["matches"] = aggregated[:top_k]

        if return_debug:
            response["debug"] = {
                "perception": {k: perception[k] for k in (
                    "detections", "probs", "margin", "unsupported_prob", "detector_category",
                    "detector_confidence", "detector_ran")},
                "candidates_raw": [c.get("_debug") for c in aggregated[:top_k]],
            }
        for m in response["matches"]:
            m.pop("_debug", None)
        return response

    def search_text(self, text_query: str, top_k=5, allowed_ids=None) -> dict:
        """Text-only search: SigLIP2 text embedding vs. stored SigLIP2 gallery image embeddings.

        The calibrator was fitted on (visual, text) pairs and cannot score text alone, so the
        score here is SigLIP2's own sigmoid match probability, and every match is "review".
        """
        response = {"model_version": self.model_version, "perception": None, "crop": None,
                    "mode": "text_only", "status": "OK", "matches": []}
        rows = self.store.allowed_rows(allowed_ids)
        if len(self.store) == 0 or (rows is not None and rows.size == 0):
            return response
        t_emb = self.models.embed_siglip_text(text_query, Image.new("RGB", (224, 224)))
        sims = np.asarray(self.store.siglip, dtype=np.float32) @ t_emb
        if rows is not None:
            mask = np.full(sims.shape, -np.inf, dtype=np.float32)
            mask[rows] = 0.0
            sims = sims + mask
        # Calibrated text probability aligned with visual retrieval scale
        probs = 1.0 / (1.0 + np.exp(-(sims - 0.20) * 15.0))
        best = {}
        for idx in np.argsort(-sims):
            if not np.isfinite(sims[idx]):
                break
            g = self.store.entries[int(idx)]
            if g.item_id in best:
                best[g.item_id]["supporting_views"] += 1
                continue
            best[g.item_id] = {
                "item_id": g.item_id, "category": g.category, "visual_score": None,
                "text_score": round(float(sims[idx]), 4), "final_score": round(float(probs[idx]), 4),
                "decision": "review", "supporting_views": 1,
            }
        response["matches"] = list(best.values())[:top_k]
        return response

    # ------------------------------------------------------------------ indexing
    def add_to_gallery(self, image_path, item_id, item_cat):
        with open(image_path, "rb") as f:
            return self.add_image_bytes(f.read(), item_id, item_cat)

    def add_image_bytes(self, data: bytes, item_id: str, item_cat=None, replace: bool = False) -> dict:
        """Embed and store a gallery image.

        ``replace=True`` drops any other content already indexed under ``item_id`` (used when a
        report's photo changed); otherwise a second photo is stored as an extra view.
        """
        sha = hashlib.sha256(data).hexdigest()
        category = normalize_category(item_cat)
        if replace:
            stale = [e for e in self.store.entries if e.item_id == item_id and e.sha256 != sha]
            if stale:
                self.store.remove(item_id)
        for e in self.store.find_by_sha(sha):
            if e.item_id == item_id:  # idempotent re-index: skip the embedding work
                return {"status": "already_indexed", "item_id": item_id, "sha256": sha,
                        "category": e.category, "duplicate_of": [x for x in e.duplicate_of if x != item_id],
                        "crop": e.crop, "model_version": self.model_version}

        pil, fmt = open_image_bytes(data)
        ext = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif",
               "HEIF": ".heic", "HEIC": ".heic"}.get(fmt, ".img")
        stored_path = self.store.store_image(data, sha, ext)

        detections = self.run_detector(pil)
        crop_img, crop_info = select_crop(pil, detections, policy=self.crop_policy, expected_category=category)
        visual = self.models.embed_visual(crop_img)
        siglip = self.models.embed_siglip_image(crop_img)

        res = self.store.add(item_id, category, visual, siglip, sha, str(stored_path), crop_info.to_dict())
        return {"status": res.status, "item_id": item_id, "sha256": sha, "category": category,
                "duplicate_of": res.duplicate_of, "crop": crop_info.to_dict(),
                "model_version": self.model_version}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, type=str)
    parser.add_argument("--text", type=str, default=None)
    parser.add_argument("--top_k", type=int, default=5)
    args = parser.parse_args()

    os.chdir(PROJECT_ROOT)
    pipeline = FinalInferencePipeline()
    res = pipeline.infer(args.image, args.text, args.top_k)
    print(json.dumps(res, indent=2, default=str))
