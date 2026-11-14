"""Phase 2 evaluation manifest: schema, loading and integrity checks.

One JSON object per line. Required fields (see PHASE_2_EVALUATION_REPORT.md §4):
image_path, category, physical_instance_id, view_id, ground_truth_bbox, source, split,
verification_status. Optional: sha256, width, height, bbox_status, training_overlap_risk,
identity_basis, notes, origin_path.
"""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Iterable, Optional

from src.categories import CANONICAL_CATEGORIES

REQUIRED_FIELDS = ("image_path", "category", "physical_instance_id", "view_id",
                   "ground_truth_bbox", "source", "split", "verification_status")
VALID_SPLITS = ("train", "validation", "test", "eval_pilot")


class ManifestError(ValueError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def record_key(rec: dict) -> str:
    return f"{rec['physical_instance_id']}/{rec['view_id']}"


def validate_record(rec: dict, root: Path) -> list[str]:
    errs = [f"missing field {f!r}" for f in REQUIRED_FIELDS if f not in rec]
    if errs:
        return errs
    if rec["category"] not in CANONICAL_CATEGORIES:
        errs.append(f"non-canonical category {rec['category']!r}")
    if rec["split"] not in VALID_SPLITS:
        errs.append(f"invalid split {rec['split']!r}")
    bbox = rec["ground_truth_bbox"]
    if bbox is not None:
        if not (isinstance(bbox, list) and len(bbox) == 4 and bbox[2] > bbox[0] and bbox[3] > bbox[1]):
            errs.append(f"malformed ground_truth_bbox {bbox!r}")
    path = Path(rec["image_path"])
    if not path.is_absolute():
        path = root / path
    if not path.is_file():
        errs.append(f"image not found: {rec['image_path']}")
    return errs


def load_manifest(path: str | Path, root: str | Path, compute_sha: bool = True) -> list[dict]:
    """Load and validate. Raises ManifestError listing *every* problem (missing files are fatal)."""
    root = Path(root)
    path = Path(path)
    if not path.is_file():
        raise ManifestError(f"manifest not found: {path}")
    records, problems = [], []
    for ln, line in enumerate(path.read_text().splitlines(), 1):
        if not line.strip():
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError as e:
            problems.append(f"line {ln}: invalid JSON ({e})")
            continue
        errs = validate_record(rec, root)
        if errs:
            problems.extend(f"line {ln} ({rec.get('image_path')}): {e}" for e in errs)
            continue
        abs_path = Path(rec["image_path"]) if Path(rec["image_path"]).is_absolute() else root / rec["image_path"]
        rec["_abs_path"] = str(abs_path)
        if compute_sha:
            actual = sha256_bytes(abs_path.read_bytes())
            if rec.get("sha256") and rec["sha256"] != actual:
                problems.append(f"line {ln}: sha256 mismatch for {rec['image_path']}")
            rec["sha256"] = actual
        records.append(rec)
    keys = [record_key(r) for r in records]
    dup_keys = {k for k in keys if keys.count(k) > 1}
    if dup_keys:
        problems.append(f"duplicate (instance, view) keys: {sorted(dup_keys)}")
    if problems:
        raise ManifestError("manifest invalid:\n  " + "\n  ".join(problems))
    return records


def instance_split_violations(records: Iterable[dict]) -> dict[str, list[str]]:
    """Physical instances that appear in more than one split."""
    splits = defaultdict(set)
    for r in records:
        splits[r["physical_instance_id"]].add(r["split"])
    return {k: sorted(v) for k, v in splits.items() if len(v) > 1}


def duplicate_content_groups(records: Iterable[dict]) -> list[list[str]]:
    """Groups of records whose image bytes are identical (sha256)."""
    groups = defaultdict(list)
    for r in records:
        groups[r["sha256"]].append(record_key(r))
    return [sorted(v) for v in groups.values() if len(v) > 1]


def cross_instance_duplicates(records: Iterable[dict]) -> list[list[str]]:
    """Identical bytes under *different* physical instances — an identity error."""
    by_sha = defaultdict(set)
    for r in records:
        by_sha[r["sha256"]].add(r["physical_instance_id"])
    return [sorted(v) for v in by_sha.values() if len(v) > 1]


def filter_records(records: list[dict], sources: Optional[list[str]] = None,
                   categories: Optional[list[str]] = None, splits: Optional[list[str]] = None) -> list[dict]:
    out = records
    if sources:
        out = [r for r in out if r["source"] in sources]
    if categories:
        out = [r for r in out if r["category"] in categories]
    if splits:
        out = [r for r in out if r["split"] in splits]
    return out
