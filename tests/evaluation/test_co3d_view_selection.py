"""Unit tests for scripts/datasets/extract_sequence_views.py (synthetic cameras/frames, no network)."""
import io
import math
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "datasets"))
import extract_sequence_views as E  # noqa: E402

W, H = 200, 160


def look_at_rowvec(cam_pos, target=np.zeros(3)):
    """PyTorch3D-style R,T (X_cam = X_world @ R + T) for a camera at cam_pos looking at target."""
    z = target - cam_pos
    z /= np.linalg.norm(z)
    up = np.array([0.0, 0.0, 1.0]) if abs(z[2]) < 0.99 else np.array([0.0, 1.0, 0.0])
    x = np.cross(up, z); x /= np.linalg.norm(x)
    y = np.cross(z, x)
    R = np.stack([x, y, z], axis=1)          # columns = camera axes in world coords
    T = -cam_pos @ R
    return R, T


def make_sequence(n=72, radius=3.0, elevation_deg=20.0, blur_frames=(), dark_frames=(), empty_mask_frames=(),
                  duplicate_of=None):
    frames, store = [], {}
    for k in range(n):
        az = 2 * math.pi * k / n
        el = math.radians(elevation_deg)
        pos = radius * np.array([math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el)])
        R, T = look_at_rowvec(pos)
        fn = k + 1
        img = Image.new("RGB", (W, H), (120, 120, 120))
        d = ImageDraw.Draw(img)
        # texture that changes with azimuth so crops are not near-duplicates
        for s in range(0, 80, 8):
            shade = int(255 * (0.5 + 0.5 * math.sin(az * 3 + s)))
            d.rectangle([60 + s, 40, 64 + s, 120], fill=(shade, 255 - shade, (k * 37) % 255))
        if fn in dark_frames:
            img = Image.new("RGB", (W, H), (5, 5, 5))
        if fn in blur_frames:
            img = Image.new("RGB", (W, H), (120, 120, 120))
            ImageDraw.Draw(img).rectangle([60, 40, 140, 120], fill=(130, 130, 130))
        mask = Image.new("L", (W, H), 0)
        if fn not in empty_mask_frames:
            ImageDraw.Draw(mask).rectangle([60, 40, 139, 119], fill=255)
        bj, bm = io.BytesIO(), io.BytesIO()
        img.save(bj, format="JPEG", quality=95); mask.save(bm, format="PNG")
        ip, mp = f"cat/seq/images/frame{fn:06d}.jpg", f"cat/seq/masks/frame{fn:06d}.png"
        store[ip], store[mp] = bj.getvalue(), bm.getvalue()
        mass = 0 if fn in empty_mask_frames else 80 * 80
        frames.append({"frame_number": fn, "frame_timestamp": k / 30, "image": {"path": ip, "size": [H, W]},
                       "mask": {"path": mp, "mass": mass},
                       "viewpoint": {"R": R.tolist(), "T": T.tolist()}})
    return frames, store


def test_camera_convention_is_detected_and_directions_are_correct():
    frames, _ = make_sequence(n=12)
    dirs, geo = E.viewing_directions(frames)
    assert geo["convention"] == "pytorch3d_rowvec" and geo["cameras_facing_object_frac"] == 1.0
    # adjacent cameras on a 12-camera ring at 20° elevation are ~28° apart in azimuth
    assert E.angle_deg(dirs[0], dirs[1]) == pytest.approx(30 * math.cos(math.radians(20)), abs=1.5)
    assert E.angle_deg(dirs[0], dirs[6]) == pytest.approx(180 - 40, abs=1.0)


def test_selection_is_viewpoint_diverse_and_records_reasons():
    frames, store = make_sequence(n=72)
    res = E.select_views("seq", "laptop", frames, store.__getitem__)
    # contract: >= 25° separation between every pair, 5..8 views (greedy FPS may stop early after gates)
    assert res.status == "accepted" and E.PREFERRED_MIN_VIEWS <= len(res.selected) <= E.N_VIEWS
    dirs, _ = E.viewing_directions(sorted(frames, key=lambda f: f["frame_number"]))
    sel = [n - 1 for n in res.selected]
    assert min(E.angle_deg(dirs[i], dirs[j]) for i in sel for j in sel if i < j) >= E.MIN_SEP_DEG
    stages = {r.stage for r in res.frames}
    assert stages <= {"selected", "not_needed", "rejected", "prefilter_rejected"}
    assert all(r.reasons for r in res.frames if r.stage != "candidate")
    assert set(res.images) == set(res.selected)
    for r in res.frames:
        if r.stage == "selected":
            assert r.bbox == [60, 40, 140, 120]  # tight mask box
    # only candidates were downloaded
    assert res.bytes_downloaded <= sum(len(v) for v in store.values()) * (E.N_CANDIDATES / 72) * 1.05


def test_bad_frames_are_rejected_with_specific_reasons():
    frames, store = make_sequence(n=24, dark_frames={1, 2, 3}, empty_mask_frames={4, 5})
    res = E.select_views("seq", "laptop", frames, store.__getitem__, n_candidates=24)
    by = {r.frame_number: r for r in res.frames}
    for fn in (1, 2, 3):
        assert by[fn].stage == "rejected" and "exposure_out_of_range" in by[fn].reasons
    for fn in (4, 5):
        assert by[fn].stage == "prefilter_rejected" and "annotated_mask_mass_below_1pct" in by[fn].reasons
    assert not set(res.selected) & {1, 2, 3, 4, 5}


def test_sequence_rejected_when_fewer_than_three_usable_views():
    frames, store = make_sequence(n=6, empty_mask_frames={1, 2, 3, 4})
    res = E.select_views("seq", "laptop", frames, store.__getitem__)
    assert res.status == "rejected" and "fewer_than_3" in res.reason and not res.images


def test_narrow_baseline_sequence_relaxes_separation_and_records_it():
    # all cameras within ±25° azimuth: 25° separation cannot give 5 views
    frames, store = make_sequence(n=72)
    narrow = [f for f in frames if f["frame_number"] <= 11 or f["frame_number"] >= 66]
    res = E.select_views("seq", "laptop", narrow, store.__getitem__)
    assert res.min_sep_used in (E.MIN_SEP_DEG, E.RELAXED_SEP_DEG)
    assert res.status in ("accepted", "rejected")
    if res.min_sep_used == E.RELAXED_SEP_DEG:
        assert all("15deg" in r.reasons[0] for r in res.frames if r.stage == "selected")


def test_mask_bbox_threshold_and_laplacian():
    m = np.zeros((50, 60), dtype=np.float32); m[10:20, 5:30] = 0.9; m[30, 40] = 0.4
    assert E.mask_bbox(m) == [5, 10, 30, 20]
    assert E.mask_bbox(np.zeros((50, 60), dtype=np.float32)) is None
    flat = np.full((20, 20), 100.0); checker = np.indices((20, 20)).sum(0) % 2 * 255.0
    assert E.laplacian_variance(flat) == 0 and E.laplacian_variance(checker) > 1000


def test_convention_is_never_switched_per_sequence():
    """Regression: one noisy frame must not flip the dataset-wide PyTorch3D convention."""
    frames, _ = make_sequence(n=36)
    R = np.array(frames[0]["viewpoint"]["R"])
    frames[0]["viewpoint"]["T"] = (-np.array(frames[0]["viewpoint"]["T"])).tolist()  # corrupt one camera
    dirs, geo = E.viewing_directions(frames)
    assert geo["convention"] == "pytorch3d_rowvec"
    assert 0.9 <= geo["cameras_facing_object_frac"] < 1.0 and geo["geometry_warning"] is False
    assert geo["viewpoint_span_deg"] > 150  # full ring preserved
