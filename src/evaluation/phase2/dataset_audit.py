"""Dataset audit helpers: readability, exact duplicates, near duplicates, augmentation grouping.

Physical-instance layout (collection protocol used by Phase 2):

    <root>/<category>/<physical_instance_id>/<view files>
    <root>/<category>/<physical_instance_id>/instance.json     (identity + per-view annotations)

Flat category layout (scraped / Roboflow exports):  <root>/**/<images>

Counting rules:
  * byte-identical files count once (sha256);
  * Roboflow augmentations ``<stem>_<ext>.rf.<hash>.<ext>`` collapse onto their source ``<stem>``;
  * files whose name marks an augmentation (aug/flip/rot/blur/noise/bright) are not genuine views;
  * near-duplicates (dHash Hamming distance <= NEAR_DUP_BITS) are reported, and inside one
    instance they are collapsed into one genuine view.
"""
from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Optional

from PIL import Image

from src.categories import CANONICAL_CATEGORIES

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".bmp"}
NEAR_DUP_BITS = 4
MIN_VIEWS = 3
_RF = re.compile(r"^(?P<stem>.+?)_(?:jpg|jpeg|png|webp)\.rf\.[0-9a-f]{8,}$", re.I)
_AUG = re.compile(r"(?:^|[_\-.])(aug|augmented|flip|flipped|rot\d*|rotate[d]?|blur|noise|bright|contrast|crop\d+)(?:$|[_\-.\d])", re.I)


def dhash(img: Image.Image, size: int = 8) -> int:
    g = img.convert("L").resize((size + 1, size), Image.BILINEAR)
    px = list(g.getdata())
    bits = 0
    for r in range(size):
        for c in range(size):
            bits = (bits << 1) | (px[r * (size + 1) + c] > px[r * (size + 1) + c + 1])
    return bits


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def source_key(path: Path) -> tuple[str, bool]:
    """(source stem, is_augmentation) inferred from the filename."""
    stem = path.stem
    m = _RF.match(stem)
    if m:
        return m.group("stem"), True
    if _AUG.search(stem):
        return _AUG.sub("_", stem).strip("_"), True
    return stem, False


def inspect_file(path: Path) -> dict:
    data = path.read_bytes()
    info = {"path": str(path), "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    try:
        with Image.open(path) as im:
            im.verify()
        with Image.open(path) as im:
            info["width"], info["height"] = im.size
            info["dhash"] = dhash(im)
        info["readable"] = True
    except Exception as e:
        info["readable"] = False
        info["error"] = str(e)[:200]
    src, aug = source_key(path)
    info["source_key"], info["is_augmentation"] = src, aug
    return info


def list_images(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS)


def _cluster_near_dups(files: list[dict]) -> list[list[str]]:
    groups, used = [], set()
    for i, a in enumerate(files):
        if i in used or "dhash" not in a:
            continue
        g = [i]
        for j in range(i + 1, len(files)):
            b = files[j]
            if j not in used and "dhash" in b and a["sha256"] != b["sha256"] and hamming(a["dhash"], b["dhash"]) <= NEAR_DUP_BITS:
                g.append(j)
        if len(g) > 1:
            used.update(g)
            groups.append([files[k]["path"] for k in g])
    return groups


def audit_instance(inst_dir: Path) -> dict:
    meta_path = inst_dir / "instance.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    files = [inspect_file(p) for p in list_images(inst_dir)]
    readable = [f for f in files if f["readable"]]
    by_sha = defaultdict(list)
    for f in readable:
        by_sha[f["sha256"]].append(f["path"])
    exact_dups = [v for v in by_sha.values() if len(v) > 1]
    unique = [next(f for f in readable if f["sha256"] == s) for s in by_sha]
    genuine = [f for f in unique if not f["is_augmentation"]]
    near = _cluster_near_dups(genuine)
    near_collapsed = sum(len(g) - 1 for g in near)
    n_views = len(genuine) - near_collapsed
    identity = meta.get("identity_status", "UNKNOWN")
    return {
        "category": meta.get("category", inst_dir.parent.name),
        "physical_instance_id": meta.get("physical_instance_id", inst_dir.name),
        "dir": str(inst_dir),
        "source": meta.get("source", "unknown"),
        "original_files": len(files),
        "unreadable_files": [f["path"] for f in files if not f["readable"]],
        "exact_duplicate_groups": exact_dups,
        "augmentation_files": [f["path"] for f in unique if f["is_augmentation"]],
        "near_duplicate_groups": near,
        "valid_genuine_views": n_views,
        "has_min_views": n_views >= MIN_VIEWS,
        "identity_status": identity,
        "identity_basis": meta.get("identity_basis"),
        "training_overlap_risk": meta.get("training_overlap_risk", "UNKNOWN"),
        "originals_local": meta.get("originals_local", True),
        "m4c_eligible": (n_views >= MIN_VIEWS and identity == "TRUSTWORTHY"
                         and meta.get("originals_local", True) and not meta.get("derived_crops_only", False)),
        "files": files,
    }


def audit_instance_root(root: Path) -> dict:
    if not root.exists():
        return {"root": str(root), "exists": False, "instances": [],
                "per_category": {c: _empty_cat() for c in CANONICAL_CATEGORIES}}
    instances = []
    unknown_dirs = []
    for cat_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        if cat_dir.name not in CANONICAL_CATEGORIES:
            unknown_dirs.append(cat_dir.name)
            continue
        for inst_dir in sorted(p for p in cat_dir.iterdir() if p.is_dir()):
            instances.append(audit_instance(inst_dir))
    # identity errors: the same bytes under two instances
    owner = defaultdict(set)
    for inst in instances:
        for f in inst["files"]:
            owner[f["sha256"]].add(inst["physical_instance_id"])
    cross = [sorted(v) for v in owner.values() if len(v) > 1]
    per_cat = {c: _empty_cat() for c in CANONICAL_CATEGORIES}
    for inst in instances:
        pc = per_cat[inst["category"]]
        pc["instance_dirs"] += 1
        pc["original_images"] += inst["original_files"]
        pc["valid_genuine_views"] += inst["valid_genuine_views"]
        pc["instances_with_ge2_views"] += inst["valid_genuine_views"] >= 2
        pc["instances_with_ge3_views"] += inst["has_min_views"]
        pc["trustworthy_instances"] += inst["identity_status"] == "TRUSTWORTHY"
        pc["m4c_eligible_instances"] += inst["m4c_eligible"]
        if inst["m4c_eligible"]:
            pc["m4c_eligible_images"] += inst["valid_genuine_views"]
        v = inst["valid_genuine_views"]
        pc["positive_pairs"] += v * (v - 1) // 2
    return {"root": str(root), "exists": True, "instances": instances, "per_category": per_cat,
            "non_canonical_category_dirs": unknown_dirs, "cross_instance_duplicates": cross}


def _empty_cat() -> dict:
    return {"instance_dirs": 0, "original_images": 0, "valid_genuine_views": 0,
            "instances_with_ge2_views": 0, "instances_with_ge3_views": 0, "trustworthy_instances": 0,
            "m4c_eligible_instances": 0, "m4c_eligible_images": 0, "positive_pairs": 0}


def audit_flat_category_dir(root: Path, claimed_category: Optional[str] = None) -> dict:
    """Category-level pool (e.g. Roboflow export): separate originals from augmentations."""
    if not root.exists():
        return {"root": str(root), "exists": False, "category": claimed_category}
    files = [inspect_file(p) for p in list_images(root)]
    readable = [f for f in files if f["readable"]]
    shas = {f["sha256"] for f in readable}
    sources = defaultdict(list)
    for f in readable:
        sources[f["source_key"]].append(f["path"])
    originals = [f for f in readable if not f["is_augmentation"]]
    near = _cluster_near_dups(originals)
    return {
        "root": str(root), "exists": True, "category": claimed_category,
        "files": len(files), "unreadable": len(files) - len(readable),
        "unique_bytes": len(shas), "augmentation_files": sum(f["is_augmentation"] for f in readable),
        "unique_source_keys": len(sources),
        "near_duplicate_groups_among_originals": len(near),
        "estimated_unique_sources": len(sources) - sum(len(g) - 1 for g in near),
        "source_groups": {k: v for k, v in sorted(sources.items())},
    }
