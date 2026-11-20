"""Single home for "which reports may be matched against which" and "when is a match automatic".

Every search path (public /retrieval/search, auto-match on report creation, index sync) uses
these functions, so the direction rules cannot drift apart again.

Direction rules
- A *lost* query is matched against *open found* reports only.
- A *found* query is matched against *open lost* reports only.
- Never: the same report type, a non-open (resolved / closed) report, a deleted report, a report
  without an indexed item, or the query's own report.

Auto-match rule (see docs/MATCHING_THRESHOLDS.md)
- A CandidateMatch row is created only when the score clears ``AUTO_MATCH_MIN_SCORE``, the ML
  decision is "candidate", the query was an image query and the open-set gate said SUPPORTED.
- A match is a *suggestion for staff review*. It is never treated as proof of ownership.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Iterable, Optional

from sqlalchemy.orm import Session

from src.api import models

REPORT_TYPES = ("lost", "found")
OPEN = "open"

# Provisional, conservative default. Replaced by the calibrated value in
# configs/matching_thresholds.json (written by scripts/calibrate_match_threshold.py).
PROVISIONAL_AUTO_MATCH_MIN_SCORE = 0.90


class InvalidQueryType(ValueError):
    pass


def target_type_for(query_type: str) -> str:
    if query_type == "lost":
        return "found"
    if query_type == "found":
        return "lost"
    raise InvalidQueryType(f"query_type must be 'lost' or 'found', got {query_type!r}")


def is_eligible_target(report: Optional[models.Report], query_type: str,
                       exclude_report_id: Optional[str] = None) -> bool:
    if report is None or not report.item_instance_id:
        return False
    if report.report_type != target_type_for(query_type):
        return False
    if report.status != OPEN:
        return False
    if exclude_report_id and report.report_id == exclude_report_id:
        return False
    return True


def eligible_targets(db: Session, query_type: str, exclude_report_id: Optional[str] = None,
                     exclude_item_ids: Iterable[str] = ()) -> dict[str, models.Report]:
    """item_instance_id -> Report for every report a query of ``query_type`` may match."""
    q = db.query(models.Report).filter(
        models.Report.report_type == target_type_for(query_type),
        models.Report.status == OPEN,
        models.Report.item_instance_id.isnot(None),
    )
    if exclude_report_id:
        q = q.filter(models.Report.report_id != exclude_report_id)
    skip = set(exclude_item_ids)
    return {r.item_instance_id: r for r in q.all() if r.item_instance_id not in skip}


def is_index_eligible(report: models.Report) -> bool:
    """Reports that belong in the ML gallery: open lost or found reports with an item id."""
    return bool(report.item_instance_id) and report.report_type in REPORT_TYPES and report.status == OPEN


# --------------------------------------------------------------------------- thresholds
@dataclass(frozen=True)
class AutoMatchPolicy:
    min_score: float
    source: str

    @classmethod
    def load(cls) -> "AutoMatchPolicy":
        env = os.environ.get("AUTO_MATCH_MIN_SCORE")
        if env:
            return cls(float(env), "env:AUTO_MATCH_MIN_SCORE")
        import json
        from pathlib import Path
        path = Path(__file__).resolve().parents[3] / "configs" / "matching_thresholds.json"
        if path.exists():
            try:
                cfg = json.loads(path.read_text())
                return cls(float(cfg["auto_match_min_score"]), f"file:{path.name}")
            except Exception:
                pass
        return cls(PROVISIONAL_AUTO_MATCH_MIN_SCORE, "provisional_default")


def should_auto_match(score: float, decision: Optional[str], query_mode: str,
                      perception_decision: Optional[str], policy: Optional[AutoMatchPolicy] = None) -> bool:
    policy = policy or AutoMatchPolicy.load()
    if query_mode == "text_only":
        return False  # uncalibrated modality: never automatic
    if perception_decision not in (None, "SUPPORTED"):
        return False
    if decision is not None and decision != "candidate":
        return False
    return float(score) >= policy.min_score
