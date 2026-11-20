from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from src.api import models, schemas
from src.api.database import get_db
from src.api.auth import get_current_user
from src.categories import normalize_category
from src.api.services.retrieval_service import to_browser_image
from src.api.schemas import RetrievalQuery
from src.api.auth import get_optional_user
from src.api.services.privacy import image_for_viewer
import logging

log = logging.getLogger(__name__)
router = APIRouter()


def _public_report(report: models.Report, viewer, db: Session) -> schemas.ReportOut:
    """ReportOut with the found-photo privacy rule applied for this viewer."""
    out = schemas.ReportOut.model_validate(report)
    out.image_reference, out.image_blurred = image_for_viewer(report, viewer, db)
    return out


def _normalized_category_and_attributes(raw_category, attributes):
    """Canonical category (or None) + attributes that keep the user's original wording."""
    canonical = normalize_category(raw_category)
    attrs = dict(attributes or {})
    raw = (raw_category or "").strip()
    if raw and raw.lower().replace(" ", "_").replace("-", "_") != canonical:
        attrs["item_name"] = raw
    return canonical, (json.dumps(attrs) if attrs else None)

@router.post("", response_model=schemas.ReportOut, status_code=201)
def create_report(
    report: schemas.ReportCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if report.report_type not in ["lost", "found"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_REPORT_TYPE",
                "message": "Report type must be 'lost' or 'found'."
            }
        )
    
    # Architecture: Always create a new ItemInstance when a new Report is filed.
    db_item = models.ItemInstance()
    db.add(db_item)
    db.flush() # flush to get the item_instance_id
    
    report.image_reference = to_browser_image(report.image_reference)
    category, attributes = _normalized_category_and_attributes(report.item_category, report.attributes)
    db_report = models.Report(
        report_type=report.report_type,
        item_instance_id=db_item.item_instance_id,
        item_category=category,
        description=report.description,
        image_reference=report.image_reference,
        attributes=attributes,
        location=report.location,
        user_id=current_user.id
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    index_and_auto_match(db, db_report)
    return db_report


def index_and_auto_match(db: Session, db_report: models.Report) -> dict:
    """Index the new report's photo, then suggest matches in the correct direction.

    lost report  → compared with OPEN FOUND reports only
    found report → compared with OPEN LOST reports only
    A CandidateMatch is created only when ``matching.should_auto_match`` agrees (calibrated
    score threshold, ML decision "candidate", supported item, image query). Matches are
    suggestions for staff review, never proof of ownership. ML failures never fail the report.
    """
    from src.api.routers.retrieval import get_retrieval_service, run_search
    from src.api.services.index_sync import record_indexed
    from src.api.services.matching import AutoMatchPolicy, should_auto_match

    outcome = {"indexed": False, "matches_created": 0, "status": None}
    service = get_retrieval_service()
    image = db_report.image_reference
    has_image = bool(image and image.startswith("data:image"))
    try:
        if has_image:
            record_indexed(db, db_report, service.index_report(db_report, image))
            db.commit()
            outcome["indexed"] = True
    except Exception:
        log.exception("Indexing report %s failed; the startup/reindex sync will retry", db_report.report_id)

    if not has_image and not db_report.description:
        return outcome
    try:
        result = run_search(RetrievalQuery(image=image if has_image else None, text=db_report.description,
                                           top_k=5, query_type=db_report.report_type,
                                           exclude_report_id=db_report.report_id), service, db)
    except Exception:
        log.exception("Auto-match search for report %s failed", db_report.report_id)
        return outcome
    outcome["status"] = result.status
    policy = AutoMatchPolicy.load()
    perception_decision = (result.perception or {}).get("decision")
    for item in result.results:
        if not should_auto_match(item.similarity_score, item.decision, result.mode or "image",
                                 perception_decision, policy):
            continue
        lost_id, found_id = ((db_report.report_id, item.report_id) if db_report.report_type == "lost"
                             else (item.report_id, db_report.report_id))
        exists = db.query(models.CandidateMatch).filter(
            models.CandidateMatch.lost_report_id == lost_id,
            models.CandidateMatch.found_report_id == found_id).first()
        if not exists:
            db.add(models.CandidateMatch(lost_report_id=lost_id, found_report_id=found_id,
                                         similarity_score=item.similarity_score, status="pending"))
            outcome["matches_created"] += 1
    db.commit()
    return outcome


@router.get("", response_model=List[schemas.ReportOut])
def list_reports(
    report_type: Optional[str] = Query(None, description="Filter by 'lost' or 'found'"),
    status: Optional[str] = Query(None, description="Filter by status e.g. 'open'"),
    db: Session = Depends(get_db),
    viewer: Optional[models.User] = Depends(get_optional_user),
):
    """
    Public listing of reports (with pagination/filters).
    IMPORTANT: We do not expose private user details here.
    """
    query = db.query(models.Report)
    if report_type:
        query = query.filter(models.Report.report_type == report_type)
    if status:
        query = query.filter(models.Report.status == status)

    return [_public_report(r, viewer, db) for r in query.all()]

@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db),
               viewer: Optional[models.User] = Depends(get_optional_user)):
    report = db.query(models.Report).filter(models.Report.report_id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "REPORT_NOT_FOUND",
                "message": "The requested report was not found."
            }
        )
    return _public_report(report, viewer, db)

@router.put("/{report_id}", response_model=schemas.ReportOut)
def update_report(
    report_id: str, 
    update_data: schemas.ReportCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    report = db.query(models.Report).filter(models.Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this report")
        
    if update_data.report_type not in ["lost", "found"]:
        raise HTTPException(status_code=400, detail="Invalid report_type")
        
    existing_attrs = json.loads(report.attributes) if report.attributes else {}
    merged_attrs = {**existing_attrs, **(update_data.attributes or {})}
    merged_attrs.pop("item_name", None)  # recomputed from the new category text
    category, attributes = _normalized_category_and_attributes(update_data.item_category, merged_attrs)
    report.report_type = update_data.report_type
    report.item_category = category
    report.description = update_data.description
    report.image_reference = to_browser_image(update_data.image_reference)
    report.location = update_data.location
    report.attributes = attributes

    db.commit()
    db.refresh(report)
    _reindex_after_update(db, report)
    return report


def _reindex_after_update(db: Session, report: models.Report):
    """Keep the gallery in step with an edited report (new photo → replace stored content)."""
    from src.api.routers.retrieval import get_retrieval_service
    from src.api.services.index_sync import record_indexed
    from src.api.services.matching import is_index_eligible
    service = get_retrieval_service()
    try:
        if is_index_eligible(report) and report.image_reference and report.image_reference.startswith("data:image"):
            record_indexed(db, report, service.index_report(report, report.image_reference, replace=True))
            db.commit()
        elif report.item_instance_id:
            service.remove_report(report.item_instance_id)
    except Exception:
        log.exception("Re-indexing report %s after update failed; reindex sync will repair it", report.report_id)

@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    report = db.query(models.Report).filter(models.Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this report")

    if report.item_instance_id:
        try:
            from src.api.routers.retrieval import get_retrieval_service
            retrieval_service = get_retrieval_service()
            retrieval_service.remove_report(report.item_instance_id)
        except Exception:
            log.exception("Failed to remove %s from gallery store", report.item_instance_id)
        
    db.delete(report)
    db.commit()
    return None

@router.get("/{report_id}/matches")
def get_report_matches(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    report = db.query(models.Report).filter(models.Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view matches for this report")
        
    if report.report_type == "lost":
        matches = db.query(models.CandidateMatch).filter(models.CandidateMatch.lost_report_id == report_id, models.CandidateMatch.status == "pending").all()
        # enrich with found report details
        results = []
        for m in matches:
            fr = m.found_report
            if fr:
                results.append({
                    "match_id": m.match_id,
                    "similarity_score": m.similarity_score,
                    "report": {
                        "report_id": fr.report_id,
                        "item_category": fr.item_category,
                        "description": fr.description,
                        "location": fr.location,
                        "image_reference": image_for_viewer(fr, current_user, db)[0],
                        "created_at": fr.created_at
                    }
                })
            else:
                results.append({
                    "match_id": m.match_id,
                    "similarity_score": m.similarity_score,
                    "report": {
                        "report_id": "deleted",
                        "item_category": "Deleted Report",
                        "description": "This report has been deleted by the owner.",
                        "location": "Unknown",
                        "image_reference": None,
                        "created_at": m.created_at
                    }
                })
        return results
    else:
        matches = db.query(models.CandidateMatch).filter(models.CandidateMatch.found_report_id == report_id, models.CandidateMatch.status == "pending").all()
        # enrich with lost report details
        results = []
        for m in matches:
            lr = m.lost_report
            if lr:
                results.append({
                    "match_id": m.match_id,
                    "similarity_score": m.similarity_score,
                    "report": {
                        "report_id": lr.report_id,
                        "item_category": lr.item_category,
                        "description": lr.description,
                        "location": lr.location,
                        "image_reference": lr.image_reference,
                        "created_at": lr.created_at
                    }
                })
            else:
                results.append({
                    "match_id": m.match_id,
                    "similarity_score": m.similarity_score,
                    "report": {
                        "report_id": "deleted",
                        "item_category": "Deleted Report",
                        "description": "This report has been deleted by the owner.",
                        "location": "Unknown",
                        "image_reference": None,
                        "created_at": m.created_at
                    }
                })
        return results
