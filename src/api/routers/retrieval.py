import logging

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from src.api.schemas import RetrievalQuery, RetrievalResult, RetrievalResultItem
from src.api.services.retrieval_service import (QueryRejected, RetrievalService, MockRetrievalService,
                                                RealRetrievalService)
from src.api.services import matching
from src.api.services.privacy import image_for_viewer
from src.api.database import get_db
from src.api.auth import get_optional_user
from src.api.models import User

log = logging.getLogger(__name__)
UNSUPPORTED_ITEM = "UNSUPPORTED_ITEM"

router = APIRouter()

# Instantiate the RealRetrievalService to connect to the ML model on port 8001
_retrieval_service: RetrievalService = RealRetrievalService()

def get_retrieval_service() -> RetrievalService:
    return _retrieval_service

def set_retrieval_service(service: RetrievalService) -> None:
    """Swap the active service (used by tests and scripts)."""
    global _retrieval_service
    _retrieval_service = service

@router.get("/health")
def ml_health(service: RetrievalService = Depends(get_retrieval_service)):
    try:
        info = service.health()
    except Exception as e:
        return {"status": "unavailable", "model_version": service.model_version,
                "service": "real", "error": str(e)[:200]}
    return {
        "status": info.get("status", "ready"),
        "model_version": info.get("model_version", service.model_version),
        "service": info.get("service", "real"),
        "gallery_entries": (info.get("gallery") or {}).get("entries"),
    }

@router.post("/search", response_model=RetrievalResult)
def search(
    query: RetrievalQuery,
    service: RetrievalService = Depends(get_retrieval_service),
    db: Session = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
):
    """Search reports of the opposite type.

    ``query_type="lost"`` (default): someone lost an item → only OPEN FOUND reports are returned.
    ``query_type="found"``: only OPEN LOST reports. Direction/eligibility rules live in
    src/api/services/matching.py and are enforced twice: the ML service only ranks the eligible
    items, and every result is re-checked against the database before it is returned.
    """
    if not query.image and not query.text:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_QUERY",
                                                     "message": "A query image or text is required."})
    return run_search(query, service, db, viewer)


def run_search(query: RetrievalQuery, service: RetrievalService, db: Session,
               viewer: Optional[User] = None) -> RetrievalResult:
    targets = matching.eligible_targets(db, query.query_type, exclude_report_id=query.exclude_report_id)
    if not targets:
        version = service.model_version
        try:
            version = service.health().get("model_version", version)
        except Exception:
            pass
        return RetrievalResult(model_version=version, results=[], status="NO_ELIGIBLE_ITEMS",
                               message=f"There are no open {matching.target_type_for(query.query_type)} "
                                       "reports to compare against yet.")
    try:
        ml_result = service.search(query, allowed_ids=sorted(targets))
    except QueryRejected as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})
    except Exception:
        log.exception("ML retrieval failed")
        raise HTTPException(status_code=503, detail={"code": "ML_UNAVAILABLE",
                                                     "message": "The matching service is unavailable. Please try again shortly."})

    if ml_result.status == UNSUPPORTED_ITEM:
        p = ml_result.perception or {}
        return RetrievalResult(
            model_version=ml_result.model_version, results=[], status=UNSUPPORTED_ITEM,
            mode=ml_result.mode, perception=p,
            message="This photo does not look like an item Back2U can match yet "
                    "(laptops, phones, wallets, earphones, headphones, keys, books). "
                    "Please file a report with a description so staff can help.")

    enriched = []
    for item in ml_result.results:
        report = targets.get(item.item_instance_id)
        # Defence in depth: re-check against the live DB row, never trust the ML side alone.
        if not matching.is_eligible_target(report, query.query_type, query.exclude_report_id):
            continue
        image_ref, blurred = image_for_viewer(report, viewer, db)
        enriched.append(RetrievalResultItem(
            item_instance_id=item.item_instance_id,
            similarity_score=item.similarity_score,
            rank=len(enriched) + 1,
            decision=item.decision,
            visual_score=item.visual_score,
            text_score=item.text_score,
            report_id=report.report_id,
            report_type=report.report_type,
            item_category=report.item_category,
            location=report.location,
            image_reference=image_ref,
            image_blurred=blurred,
            status=report.status,
        ))

    return RetrievalResult(model_version=ml_result.model_version, results=enriched,
                           status=ml_result.status or "OK", mode=ml_result.mode,
                           perception=ml_result.perception)
