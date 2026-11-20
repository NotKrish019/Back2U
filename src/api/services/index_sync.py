"""Rebuild / verify the ML gallery from the reports stored in the backend database.

The database is the source of truth: every report with a resolvable image must be present
in the ML gallery. Reports that cannot be indexed are returned with an explicit reason —
they are never dropped silently.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from pathlib import Path
from typing import Iterable, Optional

from sqlalchemy.orm import Session

from src.api import models
from src.api.services.retrieval_service import RetrievalService, decode_data_url

log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_IMAGE_ROOTS = (PROJECT_ROOT / "frontend" / "public",)


def image_roots_from_env() -> list[Path]:
    env = os.environ.get("REPORT_IMAGE_ROOTS")
    return [Path(p) for p in env.split(os.pathsep) if p] if env else list(DEFAULT_IMAGE_ROOTS)


def resolve_report_image(ref: Optional[str], image_roots: Iterable[Path]) -> tuple[Optional[bytes], str]:
    if not ref:
        return None, "no_image_reference"
    if ref.startswith("data:"):
        data = decode_data_url(ref)
        return (data, "data_url") if data else (None, "invalid_data_url")
    if ref.startswith(("http://", "https://")):
        return None, "remote_url_not_fetched"
    rel = ref.lstrip("/")
    for root in image_roots:
        root = Path(root).resolve()
        candidate = (root / rel).resolve()
        if root not in candidate.parents:  # path traversal guard
            continue
        if candidate.is_file():
            return candidate.read_bytes(), f"file:{candidate}"
    return None, "image_file_not_found"


def _ensure_embedding_row(db: Session, report_id: str, model_version: str):
    exists = db.query(models.ReportEmbedding).filter(
        models.ReportEmbedding.report_id == report_id,
        models.ReportEmbedding.model_version == model_version,
    ).first()
    if not exists:
        db.add(models.ReportEmbedding(report_id=report_id, model_version=model_version))


def record_indexed(db: Session, report: models.Report, ml_response: dict):
    """Persist bookkeeping for a successful index call (ReportEmbedding + duplicate flag)."""
    import json
    model_version = ml_response.get("model_version") or "unknown"
    _ensure_embedding_row(db, report.report_id, model_version)
    dups = [d for d in ml_response.get("duplicate_of") or [] if d != report.item_instance_id]
    if dups:
        attrs = json.loads(report.attributes) if report.attributes else {}
        if attrs.get("duplicate_image_of_items") != dups:
            attrs["duplicate_image_of_items"] = dups
            report.attributes = json.dumps(attrs)


def plan_sync(db: Session, service: RetrievalService, image_roots: Optional[Iterable[Path]] = None) -> dict:
    """Compare the DB (source of truth) with the ML gallery. Read-only.

    Keyed on (item id, image sha256, eligibility). The model version is enforced by the ML
    service itself: a gallery built with another model version is quarantined at load, so
    after a model change every eligible report shows up here as ``to_add``.
    """
    import hashlib
    from src.api.services.matching import is_index_eligible

    image_roots = list(image_roots) if image_roots is not None else image_roots_from_env()
    model_version, indexed = service.list_indexed_detail()
    plan = {"model_version": model_version, "to_add": [], "to_replace": [], "up_to_date": [],
            "to_remove": [], "missing_image": [], "not_eligible": [], "total_reports": 0,
            "gallery_items": len(indexed)}
    wanted: set[str] = set()
    rows_by_item: dict[str, list] = {}
    reports = db.query(models.Report).order_by(models.Report.created_at).all()
    plan["total_reports"] = len(reports)
    for r in reports:
        if not is_index_eligible(r):
            plan["not_eligible"].append({"report_id": r.report_id, "status": r.status,
                                         "reason": "no_item_instance" if not r.item_instance_id else f"status_{r.status}"})
            continue
        data, how = resolve_report_image(r.image_reference, image_roots)
        if data is None:
            plan["missing_image"].append({"report_id": r.report_id, "reason": how})
            continue
        wanted.add(r.item_instance_id)
        rows_by_item.setdefault(r.item_instance_id, []).append(
            {"report_id": r.report_id, "item_id": r.item_instance_id,
             "sha256": hashlib.sha256(data).hexdigest(), "source": how.split(":")[0]})
    # Several reports may share one item instance (e.g. a lost and a found report already linked
    # to the same physical item). Compare the SET of hashes per item so they never fight.
    for item_id, rows in rows_by_item.items():
        have = indexed.get(item_id)
        want = {r["sha256"] for r in rows}
        if have is None:
            plan["to_add"].extend(rows)
        elif not have["sha256"] or set(have["sha256"]) == want:  # old ML service reports no sha
            plan["up_to_date"].extend(rows)
        else:
            for i, row in enumerate(rows):
                plan["to_replace"].append({**row, "indexed_sha256": have["sha256"], "replace_first": i == 0})
    for item_id in sorted(set(indexed) - wanted):
        owner = db.query(models.Report).filter(models.Report.item_instance_id == item_id).first()
        plan["to_remove"].append({"item_id": item_id, "report_id": owner.report_id if owner else None,
                                  "reason": "orphan_no_report" if owner is None else
                                  ("not_eligible_" + owner.status if not is_index_eligible(owner) else "image_missing")})
    return plan


def sync_reports_to_index(db: Session, service: RetrievalService, image_roots: Optional[Iterable[Path]] = None,
                          dry_run: bool = False, remove_stale: bool = True) -> dict:
    """Make the ML gallery match the DB. Idempotent: a second run changes nothing.

    - eligible report, not in gallery           → add
    - eligible report, gallery holds other bytes → replace (photo edited)
    - gallery item with no eligible report       → remove (deleted / resolved / closed / orphan)
    - eligible report whose image cannot be read → reported in ``skipped``; its gallery entry
      (if any) is kept, because removing it would lose the only copy of the embedding.
    """
    image_roots = list(image_roots) if image_roots is not None else image_roots_from_env()
    plan = plan_sync(db, service, image_roots)
    summary = {"model_version": plan["model_version"], "dry_run": dry_run,
               "already_indexed": [r["report_id"] for r in plan["up_to_date"]],
               "indexed": [], "replaced": [], "removed": [], "skipped": list(plan["missing_image"]),
               "not_eligible": plan["not_eligible"], "failed": [], "total_reports": plan["total_reports"],
               "plan": {k: len(v) if isinstance(v, list) else v for k, v in plan.items()}}
    # items whose report exists but whose image is missing are not removed (see docstring)
    removals = [x for x in plan["to_remove"] if x["reason"] != "image_missing"] if remove_stale else []
    if dry_run:
        summary["would_add"] = plan["to_add"]
        summary["would_replace"] = plan["to_replace"]
        summary["would_remove"] = removals
        return summary

    by_id = {r.report_id: r for r in db.query(models.Report).all()}
    for row in plan["up_to_date"]:
        _ensure_embedding_row(db, row["report_id"], plan["model_version"])
    jobs = [(r, False, False) for r in plan["to_add"]] + [(r, True, r.get("replace_first", True)) for r in plan["to_replace"]]
    for row, is_replace, drop_old in jobs:
        report = by_id[row["report_id"]]
        data, _ = resolve_report_image(report.image_reference, image_roots)
        try:
            res = service.index_report(report, data, replace=drop_old)
            record_indexed(db, report, res)
            (summary["replaced"] if is_replace else summary["indexed"]).append(
                {"report_id": report.report_id, "status": res.get("status"),
                 "duplicate_of": res.get("duplicate_of", [])})
        except Exception as e:  # keep going; report every failure
            summary["failed"].append({"report_id": report.report_id, "error": str(e)[:300]})
    for row in removals:
        res = service.remove_report(row["item_id"])
        if res.get("status") in ("success", "not_found"):
            summary["removed"].append(row)
        else:
            summary["failed"].append({"item_id": row["item_id"], "error": str(res.get("detail", res))[:300]})
    db.commit()
    for s in summary["skipped"]:
        log.warning("Report %s not indexed: %s", s["report_id"], s["reason"])
    for f in summary["failed"]:
        log.error("Index sync failure: %s", f)
    return summary


def start_background_sync(session_factory, service_factory, retry_seconds: float = 10, max_wait_seconds: float = 600):
    """Run one sync once the ML service is reachable (it can take ~1 min to load models)."""
    def run():
        deadline = time.time() + max_wait_seconds
        while True:
            db = session_factory()
            try:
                summary = sync_reports_to_index(db, service_factory())
                log.info("Startup index sync: %d up to date, %d added, %d replaced, %d removed, "
                         "%d skipped, %d failed (model %s)",
                         len(summary["already_indexed"]), len(summary["indexed"]), len(summary["replaced"]),
                         len(summary["removed"]), len(summary["skipped"]), len(summary["failed"]),
                         summary["model_version"])
                return
            except Exception as e:
                if time.time() > deadline:
                    log.error("Startup index sync gave up: %s", e)
                    return
                log.info("ML service not ready for index sync (%s); retrying in %ss", e, retry_seconds)
            finally:
                db.close()
            time.sleep(retry_seconds)

    t = threading.Thread(target=run, name="index-sync", daemon=True)
    t.start()
    return t
