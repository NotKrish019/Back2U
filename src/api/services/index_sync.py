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


def sync_reports_to_index(db: Session, service: RetrievalService, image_roots: Optional[Iterable[Path]] = None) -> dict:
    image_roots = list(image_roots) if image_roots is not None else image_roots_from_env()
    model_version, indexed = service.list_indexed()
    summary = {"model_version": model_version, "already_indexed": [], "indexed": [],
               "skipped": [], "failed": [], "total_reports": 0}

    reports = db.query(models.Report).order_by(models.Report.created_at).all()
    summary["total_reports"] = len(reports)
    for r in reports:
        if not r.item_instance_id:
            summary["skipped"].append({"report_id": r.report_id, "reason": "no_item_instance"})
            continue
        if r.item_instance_id in indexed:
            _ensure_embedding_row(db, r.report_id, model_version)
            summary["already_indexed"].append(r.report_id)
            continue
        data, how = resolve_report_image(r.image_reference, image_roots)
        if data is None:
            summary["skipped"].append({"report_id": r.report_id, "reason": how})
            continue
        try:
            res = service.index_report(r, data)
            record_indexed(db, r, res)
            indexed.add(r.item_instance_id)
            summary["indexed"].append({"report_id": r.report_id, "status": res.get("status"),
                                       "duplicate_of": res.get("duplicate_of", [])})
        except Exception as e:  # keep going; report every failure
            summary["failed"].append({"report_id": r.report_id, "error": str(e)[:300]})
    db.commit()
    for s in summary["skipped"]:
        log.warning("Report %s not indexed: %s", s["report_id"], s["reason"])
    for f in summary["failed"]:
        log.error("Report %s failed to index: %s", f["report_id"], f["error"])
    return summary


def start_background_sync(session_factory, service_factory, retry_seconds: float = 10, max_wait_seconds: float = 600):
    """Run one sync once the ML service is reachable (it can take ~1 min to load models)."""
    def run():
        deadline = time.time() + max_wait_seconds
        while True:
            db = session_factory()
            try:
                summary = sync_reports_to_index(db, service_factory())
                log.info("Startup index sync: %d already, %d indexed, %d skipped, %d failed (model %s)",
                         len(summary["already_indexed"]), len(summary["indexed"]),
                         len(summary["skipped"]), len(summary["failed"]), summary["model_version"])
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
