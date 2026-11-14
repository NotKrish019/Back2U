"""Select representative, viewpoint-diverse views of one multi-view object sequence (CO3D).

Design: reports/evaluation/HYBRID_DATASET_PLAN.md §5. Pure selection logic lives in functions that
take frame annotations and a ``fetch(member_path) -> bytes`` callable, so the algorithm is testable
without network access.

Algorithm per sequence
  1. Camera geometry from CO3D viewpoints (PyTorch3D convention X_cam = X_world·R + T). The camera
     convention is *checked*, not assumed: the variant whose optical axes intersect in front of the
     cameras is used. The object point is the least-squares intersection of the optical axes.
  2. Pre-selection without downloading: drop frames whose annotated mask mass is < 1 % or > 95 %
     of the image; greedy farthest-point sampling over viewing directions → ≤ N_CANDIDATES frames.
  3. Download only those candidates (image + mask). Quality gates, each recorded per frame:
       mask present (≥ 1 % of pixels > 0.5), tight mask box, crop side ≥ 64 px,
       truncation (box touching ≥ 3 image borders), exposure (crop mean luminance in [30, 225]),
       sharpness (variance of Laplacian; bottom 25 % of the sequence's candidates rejected).
  4. Final selection: farthest-point sampling over viewing direction among passing frames, starting
     from the sharpest, with ≥ 25° separation (relaxed to 15° only if fewer than 5 views result —
     recorded), rejecting crops within dHash Hamming ≤ 4 of an already selected crop.
  5. ≥ 3 selected views → accepted; otherwise the sequence is rejected with the reason.

Identity: the CO3D sequence name is the positive-group identity. Nothing is inferred from pixels.

CLI (single sequence, for debugging):
    python scripts/datasets/extract_sequence_views.py --category laptop --sequence 112_13277_23636 \
        --zip-url https://dl.fbaipublicfiles.com/co3dv2_231130/laptop_001.zip --out /tmp/x
"""
from __future__ import annotations

import io
import math
from dataclasses import dataclass, field
from typing import Callable, Optional

import numpy as np
from PIL import Image

N_CANDIDATES = 24
N_VIEWS = 8
MIN_VIEWS_ACCEPT = 3
PREFERRED_MIN_VIEWS = 5
MIN_SEP_DEG = 25.0
RELAXED_SEP_DEG = 15.0
MASK_THRESHOLD = 0.5
MIN_MASK_FRAC = 0.01
MAX_MASK_MASS_FRAC = 0.95
MIN_CROP_SIDE = 64
EXPOSURE_RANGE = (30.0, 225.0)
SHARPNESS_DROP_FRACTION = 0.25
NEAR_DUP_BITS = 4


# ---------------------------------------------------------------- geometry
def _camera_variants(R: np.ndarray, T: np.ndarray):
    """Yield (name, centers[N,3], axes[N,3]) for the plausible conventions."""
    # PyTorch3D row-vector: X_cam = X_world @ R + T  → C = -T @ R^T, optical axis = R[:, 2]
    yield "pytorch3d_rowvec", -np.einsum("nj,nkj->nk", T, R), R[:, :, 2]
    # Column-vector: X_cam = R @ X_world + T → C = -R^T T, optical axis = R[2, :]
    yield "colvec", -np.einsum("nji,nj->ni", R, T), R[:, 2, :]


def _ls_intersection(C: np.ndarray, a: np.ndarray) -> np.ndarray:
    a = a / np.linalg.norm(a, axis=1, keepdims=True)
    A = np.zeros((3, 3))
    b = np.zeros(3)
    for c, d in zip(C, a):
        P = np.eye(3) - np.outer(d, d)
        A += P
        b += P @ c
    return np.linalg.lstsq(A, b, rcond=None)[0]


FACING_WARN = 0.9


def viewing_directions(frames: list[dict]) -> tuple[np.ndarray, dict]:
    """Unit vectors from the object point to each camera centre, plus diagnostics.

    CO3D documents ONE convention for the whole dataset (PyTorch3D, X_cam = X_world·R + T), so it
    is fixed here — never switched per sequence (an earlier auto-selection flipped conventions on a
    single noisy frame and halved the measured viewpoint span). Only the optical-axis sign is
    checked; the fraction of cameras facing the object is recorded and < 0.9 raises a warning.
    """
    R = np.array([f["viewpoint"]["R"] for f in frames], dtype=np.float64)
    T = np.array([f["viewpoint"]["T"] for f in frames], dtype=np.float64)
    name, C, a = next(_camera_variants(R, T))  # pytorch3d_rowvec
    best = None
    for sign in (1.0, -1.0):
        ax = sign * a
        p = _ls_intersection(C, ax)
        depth = np.einsum("ni,ni->n", p[None, :] - C, ax / np.linalg.norm(ax, axis=1, keepdims=True))
        frac = float((depth > 0).mean())
        if best is None or frac > best[0]:
            best = (frac, sign, p)
    frac, sign, p = best
    dirs = C - p
    dirs /= np.maximum(np.linalg.norm(dirs, axis=1, keepdims=True), 1e-9)
    span = max((angle_deg(dirs[i], dirs[j]) for i in range(0, len(dirs), 5) for j in range(i, len(dirs), 5)), default=0.0)
    return dirs, {"convention": name, "axis_sign": sign, "cameras_facing_object_frac": round(frac, 4),
                  "viewpoint_span_deg": round(span, 1), "geometry_warning": frac < FACING_WARN}


def angle_deg(u: np.ndarray, v: np.ndarray) -> float:
    return math.degrees(math.acos(float(np.clip(np.dot(u, v), -1.0, 1.0))))


def farthest_point_order(dirs: np.ndarray, idx: list[int], start: int, k: int, min_sep: float = 0.0) -> list[int]:
    chosen = [start]
    while len(chosen) < k:
        best, best_d = None, -1.0
        for i in idx:
            if i in chosen:
                continue
            d = min(angle_deg(dirs[i], dirs[j]) for j in chosen)
            if d > best_d:
                best, best_d = i, d
        if best is None or best_d < min_sep:
            break
        chosen.append(best)
    return chosen


# ---------------------------------------------------------------- image quality
def mask_bbox(mask: np.ndarray, thr: float = MASK_THRESHOLD) -> Optional[list[int]]:
    m = mask >= thr
    if m.mean() < MIN_MASK_FRAC:
        return None
    ys, xs = np.where(m)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def laplacian_variance(gray: np.ndarray) -> float:
    g = gray.astype(np.float64)
    if g.shape[0] < 3 or g.shape[1] < 3:
        return 0.0
    lap = (-4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:])
    return float(lap.var())


def dhash(img: Image.Image, size: int = 8) -> int:
    g = np.asarray(img.convert("L").resize((size + 1, size), Image.BILINEAR), dtype=np.int16)
    bits = (g[:, :-1] > g[:, 1:]).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


@dataclass
class FrameRecord:
    frame_number: int
    timestamp: float
    image_path: str
    mask_path: str
    image_size: list[int]
    stage: str = "candidate"          # prefilter_rejected | candidate | rejected | selected | not_needed
    reasons: list[str] = field(default_factory=list)
    scores: dict = field(default_factory=dict)
    bbox: Optional[list[int]] = None


@dataclass
class SequenceResult:
    sequence_name: str
    category: str
    status: str                       # accepted | rejected
    reason: str
    geometry: dict
    frames: list[FrameRecord]
    selected: list[int]               # frame numbers in selection order
    min_sep_used: Optional[float]
    images: dict = field(default_factory=dict)   # frame_number -> (jpg bytes, png bytes) for selected
    bytes_downloaded: int = 0


def select_views(sequence_name: str, category: str, frames: list[dict],
                 fetch: Callable[[str], bytes], n_views: int = N_VIEWS,
                 n_candidates: int = N_CANDIDATES) -> SequenceResult:
    frames = sorted(frames, key=lambda f: f["frame_number"])
    recs = [FrameRecord(f["frame_number"], float(f.get("frame_timestamp") or 0.0), f["image"]["path"],
                        f["mask"]["path"], list(f["image"]["size"])) for f in frames]
    if len(frames) < MIN_VIEWS_ACCEPT:
        return SequenceResult(sequence_name, category, "rejected", "fewer_than_3_annotated_frames", {}, recs, [], None)
    dirs, geo = viewing_directions(frames)

    # --- stage 1: metadata-only prefilter
    eligible = []
    for i, (f, r) in enumerate(zip(frames, recs)):
        h, w = f["image"]["size"]
        mass = f["mask"].get("mass")
        frac = (mass / float(h * w)) if mass is not None else None
        r.scores["mask_mass_frac"] = round(frac, 4) if frac is not None else None
        if frac is not None and frac < MIN_MASK_FRAC:
            r.stage, r.reasons = "prefilter_rejected", ["annotated_mask_mass_below_1pct"]
        elif frac is not None and frac > MAX_MASK_MASS_FRAC:
            r.stage, r.reasons = "prefilter_rejected", ["annotated_mask_mass_above_95pct"]
        else:
            eligible.append(i)
    if len(eligible) < MIN_VIEWS_ACCEPT:
        return SequenceResult(sequence_name, category, "rejected", "fewer_than_3_frames_after_mask_prefilter",
                              geo, recs, [], None)
    start = eligible[len(eligible) // 2]
    cand = farthest_point_order(dirs, eligible, start, min(n_candidates, len(eligible)))
    for i in eligible:
        if i not in cand:
            recs[i].stage, recs[i].reasons = "not_needed", ["not_in_viewpoint_candidate_set"]

    # --- stage 2: download candidates and apply quality gates
    downloaded, nbytes = {}, 0
    passing = []
    for i in cand:
        r = recs[i]
        try:
            jpg = fetch(r.image_path)
            png = fetch(r.mask_path)
        except Exception as e:
            r.stage, r.reasons = "rejected", [f"fetch_failed:{type(e).__name__}"]
            continue
        nbytes += len(jpg) + len(png)
        img = Image.open(io.BytesIO(jpg)).convert("RGB")
        mask = np.asarray(Image.open(io.BytesIO(png)).convert("L"), dtype=np.float32) / 255.0
        if mask.shape != (img.size[1], img.size[0]):
            r.stage, r.reasons = "rejected", ["mask_image_size_mismatch"]
            continue
        box = mask_bbox(mask)
        if box is None:
            r.stage, r.reasons = "rejected", ["mask_empty_or_below_1pct"]
            continue
        r.bbox = box
        W, H = img.size
        crop = img.crop(tuple(box))
        cw, ch = crop.size
        gray = np.asarray(crop.convert("L"), dtype=np.float64)
        touches = sum([box[0] <= 1, box[1] <= 1, box[2] >= W - 1, box[3] >= H - 1])
        r.scores.update({"mask_frac": round(float((mask >= MASK_THRESHOLD).mean()), 4),
                         "crop_w": cw, "crop_h": ch, "border_touches": touches,
                         "luminance": round(float(gray.mean()), 2),
                         "sharpness_lapvar": round(laplacian_variance(gray), 2)})
        bad = []
        if min(cw, ch) < MIN_CROP_SIDE:
            bad.append("crop_side_below_64px")
        if touches >= 3:
            bad.append("object_truncated_3plus_borders")
        if not (EXPOSURE_RANGE[0] <= r.scores["luminance"] <= EXPOSURE_RANGE[1]):
            bad.append("exposure_out_of_range")
        if bad:
            r.stage, r.reasons = "rejected", bad
            continue
        r.scores["dhash"] = dhash(crop)
        downloaded[i] = (jpg, png)
        passing.append(i)

    if passing:
        sharp = sorted(recs[i].scores["sharpness_lapvar"] for i in passing)
        cut = sharp[int(len(sharp) * SHARPNESS_DROP_FRACTION)] if len(passing) >= 4 else -1.0
        for i in list(passing):
            if recs[i].scores["sharpness_lapvar"] < cut:
                recs[i].stage, recs[i].reasons = "rejected", ["sharpness_bottom_25pct_of_sequence"]
                passing.remove(i)

    # --- stage 3: final viewpoint-diverse selection with near-duplicate rejection
    selected, used_sep = [], None
    if passing:
        start = max(passing, key=lambda i: recs[i].scores["sharpness_lapvar"])
        for sep in (MIN_SEP_DEG, RELAXED_SEP_DEG):
            order = [start]
            pool = [i for i in passing if i != start]
            while len(order) < n_views and pool:
                best = max(pool, key=lambda i: min(angle_deg(dirs[i], dirs[j]) for j in order))
                d = min(angle_deg(dirs[best], dirs[j]) for j in order)
                if d < sep:
                    break
                pool.remove(best)
                if any(hamming(recs[best].scores["dhash"], recs[j].scores["dhash"]) <= NEAR_DUP_BITS for j in order):
                    recs[best].stage, recs[best].reasons = "rejected", ["near_duplicate_dhash"]
                    continue
                order.append(best)
            selected, used_sep = order, sep
            if len(order) >= PREFERRED_MIN_VIEWS:
                break
        for i in passing:
            if i in selected:
                recs[i].stage = "selected"
                recs[i].reasons = [f"farthest_point_view_sep>={used_sep:.0f}deg"]
                recs[i].scores["min_angle_to_other_selected_deg"] = round(
                    min((angle_deg(dirs[i], dirs[j]) for j in selected if j != i), default=0.0), 2)
            elif recs[i].stage != "rejected":
                recs[i].stage, recs[i].reasons = "not_needed", ["passed_but_not_needed_for_diversity"]

    images = {recs[i].frame_number: downloaded[i] for i in selected}
    for r in recs:
        r.scores.pop("dhash", None) if r.stage != "selected" else None
    if len(selected) < MIN_VIEWS_ACCEPT:
        return SequenceResult(sequence_name, category, "rejected", f"only_{len(selected)}_usable_views",
                              geo, recs, [recs[i].frame_number for i in selected], used_sep, {}, nbytes)
    reason = "ok" if len(selected) >= PREFERRED_MIN_VIEWS else f"accepted_with_{len(selected)}_views"
    return SequenceResult(sequence_name, category, "accepted", reason, geo, recs,
                          [recs[i].frame_number for i in selected], used_sep, images, nbytes)


if __name__ == "__main__":
    import argparse, gzip, json, sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "evaluation" / "public_datasets"))
    from remote_zip import RemoteZip
    ap = argparse.ArgumentParser()
    ap.add_argument("--category", required=True)
    ap.add_argument("--sequence", required=True)
    ap.add_argument("--zip-url", required=True)
    ap.add_argument("--frame-annotations", default=None)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    fa_path = a.frame_annotations or f"data/raw/co3d_research_only/metadata/{a.category}/frame_annotations.jgz"
    frames = [f for f in json.loads(gzip.decompress(open(fa_path, "rb").read())) if f["sequence_name"] == a.sequence]
    z = RemoteZip(a.zip_url)
    res = select_views(a.sequence, a.category, frames, z.read)
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for fn, (jpg, png) in res.images.items():
        (out / f"frame{fn:06d}.jpg").write_bytes(jpg); (out / f"frame{fn:06d}.png").write_bytes(png)
    print(json.dumps({"status": res.status, "reason": res.reason, "selected": res.selected,
                      "geometry": res.geometry, "min_sep": res.min_sep_used, "bytes": res.bytes_downloaded}, indent=1))
