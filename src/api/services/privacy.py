"""Found-item photo privacy (M9).

Photos of *found* items can show identifying details (stickers, lock screens, names on ID
cards) that a genuine owner should have to describe, not copy. Public API responses therefore
never carry the original found photo. They carry a server-side blurred, downscaled JPEG
derivative instead — the blur is baked into the pixels, so removing a CSS filter or opening
the data URL directly reveals nothing more.

Who may see the original (existing product policy, unchanged):
- the reporter who filed the found report (owner),
- staff (``is_admin == "true"``),
- a user whose claim on that found report has been approved.

Lost-report photos are published by their owner to help finders and are returned unchanged.

Known limitation (documented in docs/PRIVACY.md): the two seeded demo images under
``frontend/public/mocks`` are static files served by Next.js and are reachable by direct URL.
The API no longer returns their path for found reports, but the files themselves are public.
"""
from __future__ import annotations

import base64
import hashlib
import io
from collections import OrderedDict
from threading import Lock
from typing import Optional

from PIL import Image, ImageFilter, ImageOps

from src.api import models

BLUR_PREFIX = "BLURRED_"  # kept for frontend compatibility (badge + styling)
MAX_SIDE = 320            # derivative is downscaled before blurring
BLUR_FRACTION = 0.06      # Gaussian radius as a fraction of the longer side (~19 px at 320)

_cache: "OrderedDict[str, Optional[str]]" = OrderedDict()
_cache_lock = Lock()
_CACHE_MAX = 512


def _load_bytes(ref: str) -> Optional[bytes]:
    from src.api.services.index_sync import image_roots_from_env, resolve_report_image
    data, _ = resolve_report_image(ref, image_roots_from_env())
    return data


def blur_image_bytes(data: bytes) -> bytes:
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    radius = max(8.0, BLUR_FRACTION * max(img.size))
    img = img.filter(ImageFilter.GaussianBlur(radius))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=70)
    return out.getvalue()


def blurred_reference(ref: Optional[str]) -> Optional[str]:
    """``BLURRED_data:image/jpeg;base64,...`` of a blurred derivative, or None if undecodable.

    Never falls back to the original: if the image cannot be decoded, no image is returned.
    """
    if not ref:
        return None
    key = hashlib.sha256(ref.encode("utf-8", "ignore")).hexdigest()
    with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
    result = None
    data = _load_bytes(ref)
    if data:
        try:
            result = BLUR_PREFIX + "data:image/jpeg;base64," + base64.b64encode(blur_image_bytes(data)).decode()
        except Exception:
            result = None
    with _cache_lock:
        _cache[key] = result
        while len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)
    return result


def can_view_original(report: models.Report, viewer: Optional[models.User], db=None) -> bool:
    if report.report_type != "found":
        return True
    if viewer is None:
        return False
    if viewer.is_admin == "true" or (report.user_id and report.user_id == viewer.id):
        return True
    claims = report.claims if db is None else db.query(models.Claim).filter(
        models.Claim.report_id == report.report_id).all()
    return any(c.claimer_user_id == viewer.id and c.status == "approved" for c in claims)


def image_for_viewer(report: models.Report, viewer: Optional[models.User], db=None) -> tuple[Optional[str], bool]:
    """(image_reference to send, is_blurred)."""
    ref = report.image_reference
    if not ref:
        return None, False
    if can_view_original(report, viewer, db):
        return ref, False
    return blurred_reference(ref), True
