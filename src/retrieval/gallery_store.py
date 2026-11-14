"""Persistent gallery for the live inference service.

Layout of ``store_dir``::

    manifest.json            commit point (written last, atomically via os.replace)
    visual.<gen>.npy         (N, VISUAL_DIM) float32, L2-normalised M4-C embeddings
    siglip.<gen>.npy         (N, SIGLIP_DIM) float32, L2-normalised SigLIP2 image embeddings
    images/<sha256>.<ext>    content-addressed copy of every indexed gallery image

On load, the manifest's ``model_version`` and embedding dimensions must match the running
pipeline. An incompatible or corrupt store is never overwritten: it is moved aside to
``<store_dir>.incompatible-<timestamp>`` and the service starts empty so the backend can
rebuild it from stored reports (see src/api/services/index_sync.py).
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# torch and faiss-cpu (pip wheels on macOS) each bundle their own libomp.dylib. The live
# service previously only survived because unpickling the sklearn reranker makes sklearn set
# KMP_DUPLICATE_LIB_OK=True as a side effect. Make that explicit so behaviour no longer
# depends on import order. Proper fix (Phase 2+): a single shared OpenMP runtime.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "True")

import faiss
import numpy as np

log = logging.getLogger(__name__)

FORMAT_VERSION = 1


class IncompatibleStoreError(RuntimeError):
    pass


@dataclass
class GalleryEntry:
    item_id: str
    category: Optional[str]
    sha256: str
    image_path: str
    added_at: float
    crop: Optional[dict] = None
    duplicate_of: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "item_id": self.item_id, "category": self.category, "sha256": self.sha256,
            "image_path": self.image_path, "added_at": self.added_at, "crop": self.crop,
            "duplicate_of": list(self.duplicate_of),
        }

    @classmethod
    def from_dict(cls, d: dict) -> "GalleryEntry":
        return cls(item_id=d["item_id"], category=d.get("category"), sha256=d["sha256"],
                   image_path=d["image_path"], added_at=d.get("added_at", 0.0),
                   crop=d.get("crop"), duplicate_of=list(d.get("duplicate_of", [])))


@dataclass
class AddResult:
    status: str                    # "added" | "already_indexed"
    entry: GalleryEntry
    duplicate_of: list[str]        # other item_ids already holding byte-identical content


class GalleryStore:
    def __init__(self, store_dir: str | Path, model_version: str, visual_dim: int, siglip_dim: int):
        self.store_dir = Path(store_dir)
        self.model_version = model_version
        self.visual_dim = visual_dim
        self.siglip_dim = siglip_dim
        self.lock = threading.RLock()
        self.entries: list[GalleryEntry] = []
        self.visual = np.zeros((0, visual_dim), dtype=np.float32)
        self.siglip = np.zeros((0, siglip_dim), dtype=np.float32)
        self.index = faiss.IndexFlatIP(visual_dim)
        self.generation = 0
        self.quarantined_to: Optional[str] = None
        self.load_error: Optional[str] = None

    # ------------------------------------------------------------------ paths
    @property
    def manifest_path(self) -> Path:
        return self.store_dir / "manifest.json"

    @property
    def images_dir(self) -> Path:
        return self.store_dir / "images"

    # ------------------------------------------------------------------ load / save
    def load(self) -> "GalleryStore":
        """Load from disk. Incompatible/corrupt stores are quarantined, never overwritten."""
        with self.lock:
            if not self.manifest_path.exists():
                self.store_dir.mkdir(parents=True, exist_ok=True)
                return self
            try:
                self._load_checked()
            except IncompatibleStoreError as e:
                self.load_error = str(e)
                stamp = time.strftime("%Y%m%d-%H%M%S")
                target = self.store_dir.with_name(f"{self.store_dir.name}.incompatible-{stamp}")
                shutil.move(str(self.store_dir), str(target))
                self.quarantined_to = str(target)
                log.error("Gallery store at %s rejected (%s); moved to %s. Starting empty — "
                          "run the backend reindex to rebuild from reports.", self.store_dir, e, target)
                self.store_dir.mkdir(parents=True, exist_ok=True)
                self._reset()
            return self

    def _reset(self):
        self.entries = []
        self.visual = np.zeros((0, self.visual_dim), dtype=np.float32)
        self.siglip = np.zeros((0, self.siglip_dim), dtype=np.float32)
        self.index = faiss.IndexFlatIP(self.visual_dim)
        self.generation = 0

    def _load_checked(self):
        try:
            manifest = json.loads(self.manifest_path.read_text())
        except Exception as e:  # unreadable JSON
            raise IncompatibleStoreError(f"corrupt manifest: {e}") from e
        if manifest.get("format") != FORMAT_VERSION:
            raise IncompatibleStoreError(f"format {manifest.get('format')} != {FORMAT_VERSION}")
        if manifest.get("model_version") != self.model_version:
            raise IncompatibleStoreError(
                f"model_version {manifest.get('model_version')!r} != running {self.model_version!r}")
        if manifest.get("visual_dim") != self.visual_dim or manifest.get("siglip_dim") != self.siglip_dim:
            raise IncompatibleStoreError(
                f"dims ({manifest.get('visual_dim')},{manifest.get('siglip_dim')}) != "
                f"({self.visual_dim},{self.siglip_dim})")
        gen = int(manifest["generation"])
        entries = [GalleryEntry.from_dict(d) for d in manifest.get("entries", [])]
        try:
            visual = np.load(self.store_dir / f"visual.{gen}.npy").astype(np.float32)
            siglip = np.load(self.store_dir / f"siglip.{gen}.npy").astype(np.float32)
        except Exception as e:
            raise IncompatibleStoreError(f"missing/corrupt vector files for generation {gen}: {e}") from e
        if visual.shape != (len(entries), self.visual_dim) or siglip.shape != (len(entries), self.siglip_dim):
            raise IncompatibleStoreError(
                f"vector shapes {visual.shape}/{siglip.shape} do not match {len(entries)} entries")
        self.entries, self.visual, self.siglip, self.generation = entries, visual, siglip, gen
        self.index = faiss.IndexFlatIP(self.visual_dim)
        if len(entries):
            self.index.add(self.visual)
        log.info("Loaded gallery store: %d entries (model_version=%s)", len(entries), self.model_version)

    def _save(self):
        """Write vectors under a new generation, then atomically swap the manifest."""
        self.store_dir.mkdir(parents=True, exist_ok=True)
        new_gen = self.generation + 1
        for name, arr in (("visual", self.visual), ("siglip", self.siglip)):
            tmp = self.store_dir / f".{name}.{new_gen}.npy.tmp"
            with open(tmp, "wb") as f:
                np.save(f, arr)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self.store_dir / f"{name}.{new_gen}.npy")
        manifest = {
            "format": FORMAT_VERSION,
            "model_version": self.model_version,
            "visual_dim": self.visual_dim,
            "siglip_dim": self.siglip_dim,
            "generation": new_gen,
            "count": len(self.entries),
            "entries": [e.to_dict() for e in self.entries],
        }
        tmp = self.store_dir / ".manifest.json.tmp"
        with open(tmp, "w") as f:
            json.dump(manifest, f, indent=1)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, self.manifest_path)
        old_gen, self.generation = self.generation, new_gen
        for name in ("visual", "siglip"):
            old = self.store_dir / f"{name}.{old_gen}.npy"
            if old_gen and old.exists():
                old.unlink()

    # ------------------------------------------------------------------ mutation
    def store_image(self, data: bytes, sha256: str, ext: str) -> Path:
        self.images_dir.mkdir(parents=True, exist_ok=True)
        path = self.images_dir / f"{sha256}{ext}"
        if not path.exists():
            tmp = self.images_dir / f".{sha256}.{os.getpid()}.{threading.get_ident()}.tmp"
            tmp.write_bytes(data)
            os.replace(tmp, path)
        return path

    def find_by_sha(self, sha256: str) -> list[GalleryEntry]:
        with self.lock:
            return [e for e in self.entries if e.sha256 == sha256]

    def add(self, item_id: str, category: Optional[str], visual_vec: np.ndarray,
            siglip_vec: np.ndarray, sha256: str, image_path: str, crop: Optional[dict] = None) -> AddResult:
        visual_vec = np.asarray(visual_vec, dtype=np.float32).reshape(-1)
        siglip_vec = np.asarray(siglip_vec, dtype=np.float32).reshape(-1)
        if visual_vec.shape[0] != self.visual_dim:
            raise ValueError(f"visual embedding dim {visual_vec.shape[0]} != {self.visual_dim}")
        if siglip_vec.shape[0] != self.siglip_dim:
            raise ValueError(f"siglip embedding dim {siglip_vec.shape[0]} != {self.siglip_dim}")
        with self.lock:
            same_content = [e for e in self.entries if e.sha256 == sha256]
            for e in same_content:
                if e.item_id == item_id:
                    return AddResult("already_indexed", e, sorted({x.item_id for x in same_content} - {item_id}))
            dup_ids = sorted({e.item_id for e in same_content})
            entry = GalleryEntry(item_id=item_id, category=category, sha256=sha256,
                                 image_path=str(image_path), added_at=time.time(), crop=crop,
                                 duplicate_of=dup_ids)
            prev = (self.entries, self.visual, self.siglip)
            self.entries = self.entries + [entry]
            self.visual = np.vstack([self.visual, visual_vec[None, :]])
            self.siglip = np.vstack([self.siglip, siglip_vec[None, :]])
            try:
                self._save()
            except Exception:
                self.entries, self.visual, self.siglip = prev  # keep memory consistent with disk
                raise
            self.index.add(visual_vec[None, :])
            return AddResult("added", entry, dup_ids)

    # ------------------------------------------------------------------ queries
    def __len__(self) -> int:
        return len(self.entries)

    def item_ids(self) -> list[str]:
        with self.lock:
            return sorted({e.item_id for e in self.entries})

    def search(self, visual_vec: np.ndarray, k: int):
        with self.lock:
            k = min(k, len(self.entries))
            if k == 0:
                return [], []
            sims, idx = self.index.search(np.asarray(visual_vec, dtype=np.float32).reshape(1, -1), k)
            return sims[0].tolist(), idx[0].tolist()

    def info(self) -> dict:
        with self.lock:
            return {
                "store_dir": str(self.store_dir),
                "model_version": self.model_version,
                "visual_dim": self.visual_dim,
                "siglip_dim": self.siglip_dim,
                "entries": len(self.entries),
                "items": len({e.item_id for e in self.entries}),
                "generation": self.generation,
                "quarantined_to": self.quarantined_to,
                "load_error": self.load_error,
            }
