"""Synthetic campus-validation datasets for tests (temporary directories only).

Images are small random-noise PNGs, so every image has a distinct sha256 and dHash unless a test
deliberately copies one. Nothing here reads real photos, app.db, the gallery or the network.
"""
from __future__ import annotations

import io
import json
from pathlib import Path

import numpy as np
from PIL import Image

from src.categories import CANONICAL_CATEGORIES

VIEW_META = {
    "view_01": {"role": "owner", "background": "hostel desk", "background_id": "A", "viewpoint": "top_down", "clutter": False},
    "view_02": {"role": "owner", "background": "hostel desk", "background_id": "A", "viewpoint": "oblique_45", "clutter": False},
    "view_03": {"role": "found", "background": "library table", "background_id": "B", "viewpoint": "side", "clutter": False},
    "view_04": {"role": "found", "background": "cafeteria", "background_id": "C", "viewpoint": "low_angle", "clutter": True},
}
SECRET_DESCRIPTION = "PRIVATE-DESCRIPTION-should-never-appear"
SECRET_PSEUDONYM = "owner_PRIVATE_99"


def noise_png(seed: int, size=(64, 48)) -> bytes:
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 255, size=(size[1], size[0], 3), dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr, "RGB").save(buf, format="PNG")
    return buf.getvalue()


def box_png(colour, x: int, mark: int = 0, size=(96, 72)) -> bytes:
    """Object 'photo' that the fake models can tell apart: a coloured box on white; ``mark`` adds a
    tiny corner patch so views of one object differ in bytes (they ARE near-duplicates by dHash)."""
    img = Image.new("RGB", size, (255, 255, 255))
    img.paste(Image.new("RGB", (30, 40), colour), (x, 16))
    if mark:
        img.paste(Image.new("RGB", (3, 3), (mark, mark, mark)), (0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def instance_meta(cat: str, slot: str, lookalike_of=None, consent=True, views=None) -> dict:
    return {
        "category": cat,
        "physical_instance_id": f"campus_val:{cat}_{slot}",
        "lookalike_of": lookalike_of,
        "description": SECRET_DESCRIPTION,
        "identity_basis": "same owner, one session",
        "collected_by": "collector_A",
        "collected_on": "2026-12-01",
        "consent": {"granted": consent, "form_version": "v1", "owner_pseudonym": SECRET_PSEUDONYM},
        "views": {f"{v}.png": dict(VIEW_META[v]) for v in (views or VIEW_META)},
    }


def write_object(root: Path, cat: str, slot: str, seed: int, lookalike_of=None, consent=True,
                 views=None, image_fn=None) -> Path:
    d = root / cat / f"{cat}_{slot}"
    d.mkdir(parents=True, exist_ok=True)
    meta = instance_meta(cat, slot, lookalike_of, consent, views)
    for k, fname in enumerate(meta["views"]):
        data = image_fn(fname, k) if image_fn else noise_png(seed * 10 + k)
        (d / fname).write_bytes(data)
    (d / "instance.json").write_text(json.dumps(meta, indent=1))
    return d


def full_dataset(root: Path, pairs=(("01", "02"),), negatives: int = 2) -> Path:
    """Protocol-complete dataset: 7 categories x 4 objects x 4 views, one declared pair per category."""
    seed = 1
    for cat in CANONICAL_CATEGORIES:
        twin = {}
        for a, b in pairs:
            twin[a], twin[b] = f"campus_val:{cat}_{b}", f"campus_val:{cat}_{a}"
        for slot in ("01", "02", "03", "04"):
            write_object(root, cat, slot, seed, lookalike_of=twin.get(slot))
            seed += 1
    if negatives:
        nd = root / "negatives"
        nd.mkdir(parents=True, exist_ok=True)
        for i in range(negatives):
            (nd / f"neg_{i:02d}.png").write_bytes(noise_png(90_000 + i))
        (nd / "negatives.json").write_text(json.dumps({f"neg_{i:02d}.png": {"type": "power bank"}
                                                       for i in range(negatives)}))
    return root


def edit_meta(obj_dir: Path, fn) -> None:
    p = obj_dir / "instance.json"
    meta = json.loads(p.read_text())
    fn(meta)
    p.write_text(json.dumps(meta, indent=1))
