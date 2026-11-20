from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from src.api import models, schemas
from src.api.database import get_db
from src.api.auth import get_admin_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])

class StatusUpdate(BaseModel):
    status: str

@router.get("/overview")
def get_overview(db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    pending_claims = db.query(models.Claim).filter(models.Claim.status == "pending").count()
    pending_matches = db.query(models.CandidateMatch).filter(models.CandidateMatch.status == "pending").count()
    uncertain_matches = db.query(models.CandidateMatch).filter(models.CandidateMatch.similarity_score < 0.8).filter(models.CandidateMatch.status == "pending").count()
    recently_found = db.query(models.Report).filter(models.Report.report_type == "found").filter(models.Report.status == "open").count()
    returned_items = db.query(models.ItemInstance).filter(models.ItemInstance.resolved_at != None).count()
    open_lost_reports = db.query(models.Report).filter(models.Report.report_type == "lost").filter(models.Report.status == "open").count()
    return {
        "pending_claims": pending_claims,
        "pending_matches": pending_matches,
        "uncertain_matches": uncertain_matches,
        "recently_found": recently_found,
        "returned_items": returned_items,
        "open_lost_reports": open_lost_reports
    }

@router.get("/claims")
def get_claims(status: Optional[str] = None, db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    q = db.query(models.Claim)
    if status:
        q = q.filter(models.Claim.status == status)
    # Eagerly load the report so the frontend has details
    claims = q.order_by(desc(models.Claim.created_at)).all()
    # Serialize manually or rely on fastapi. We return dicts to include relationships easily without full Pydantic schemas.
    result = []
    for c in claims:
        result.append({
            "claim_id": c.claim_id,
            "report_id": c.report_id,
            "claimer_user_id": c.claimer_user_id,
            "status": c.status,
            "proof_text": c.proof_text,
            "created_at": c.created_at,
            "report": {
                "report_id": c.report.report_id if c.report else None,
                "item_category": c.report.item_category if c.report else None,
                "description": c.report.description if c.report else None,
                "image_reference": c.report.image_reference if c.report else None,
            } if c.report else None
        })
    return result

CLAIM_TRANSITIONS = {"pending": {"approved", "denied"}}
CANDIDATE_TRANSITIONS = {"pending": {"accepted", "rejected"}}


def _bad_transition(kind: str, current: str, requested: str, allowed: dict):
    raise HTTPException(status_code=409, detail={
        "code": "INVALID_STATUS_TRANSITION",
        "message": f"A {kind} cannot move from '{current}' to '{requested}'.",
        "allowed": sorted(allowed.get(current, set())),
    })


@router.patch("/claims/{claim_id}")
def update_claim(claim_id: str, update: StatusUpdate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    """Staff decision on a claim. pending → approved | denied (final states are immutable).

    Approving returns the item: the found report becomes "resolved", its item instance gets
    ``resolved_at``, competing pending claims are denied, and the report leaves the ML gallery.
    """
    from datetime import datetime, timezone
    claim = db.query(models.Claim).filter(models.Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail={"code": "CLAIM_NOT_FOUND", "message": "Claim not found"})
    if update.status not in CLAIM_TRANSITIONS.get(claim.status, set()):
        _bad_transition("claim", claim.status, update.status, CLAIM_TRANSITIONS)
    claim.status = update.status
    removed_from_gallery = None
    if update.status == "approved":
        report = claim.report
        if report is None or report.status != "open":
            raise HTTPException(status_code=409, detail={
                "code": "REPORT_NOT_OPEN", "message": "The found report is no longer open."})
        report.status = "resolved"
        if report.item_instance is not None:
            report.item_instance.resolved_at = datetime.now(timezone.utc)
        for other in db.query(models.Claim).filter(models.Claim.report_id == report.report_id,
                                                   models.Claim.claim_id != claim.claim_id,
                                                   models.Claim.status == "pending"):
            other.status = "denied"
        for m in db.query(models.CandidateMatch).filter(models.CandidateMatch.found_report_id == report.report_id,
                                                        models.CandidateMatch.status == "pending"):
            m.status = "rejected"
        removed_from_gallery = report.item_instance_id
    db.commit()
    db.refresh(claim)
    if removed_from_gallery:
        from src.api.routers.retrieval import get_retrieval_service
        get_retrieval_service().remove_report(removed_from_gallery)  # never raises
    return {"claim_id": claim.claim_id, "status": claim.status,
            "report_status": claim.report.status if claim.report else None}

@router.get("/candidates")
def get_candidates(status: Optional[str] = None, uncertain: bool = False, db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    q = db.query(models.CandidateMatch)
    if status:
        q = q.filter(models.CandidateMatch.status == status)
    if uncertain:
        q = q.filter(models.CandidateMatch.similarity_score < 0.8)
    matches = q.order_by(desc(models.CandidateMatch.created_at)).all()
    
    result = []
    for m in matches:
        result.append({
            "match_id": m.match_id,
            "lost_report_id": m.lost_report_id,
            "found_report_id": m.found_report_id,
            "similarity_score": m.similarity_score,
            "status": m.status,
            "created_at": m.created_at,
            "lost_report": {
                "item_category": m.lost_report.item_category if m.lost_report else None,
                "description": m.lost_report.description if m.lost_report else None,
                "image_reference": m.lost_report.image_reference if m.lost_report else None,
            } if m.lost_report else None,
            "found_report": {
                "item_category": m.found_report.item_category if m.found_report else None,
                "description": m.found_report.description if m.found_report else None,
                "image_reference": m.found_report.image_reference if m.found_report else None,
            } if m.found_report else None
        })
    return result

@router.patch("/candidates/{match_id}")
def update_candidate(match_id: str, update: StatusUpdate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    match = db.query(models.CandidateMatch).filter(models.CandidateMatch.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail={"code": "MATCH_NOT_FOUND", "message": "Candidate Match not found"})
    if update.status not in CANDIDATE_TRANSITIONS.get(match.status, set()):
        _bad_transition("candidate match", match.status, update.status, CANDIDATE_TRANSITIONS)
    # Accepting a match only confirms that staff think the two reports describe the same item.
    # Ownership is established separately through an approved claim.
    match.status = update.status
    db.commit()
    db.refresh(match)
    return {"match_id": match.match_id, "status": match.status}

@router.get("/reports")
def get_reports(report_type: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    q = db.query(models.Report)
    if report_type:
        q = q.filter(models.Report.report_type == report_type)
    if status:
        q = q.filter(models.Report.status == status)
    reports = q.order_by(desc(models.Report.created_at)).all()
    return reports

@router.get("/items")
def get_items(resolved: Optional[bool] = None, db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    q = db.query(models.ItemInstance)
    if resolved is not None:
        if resolved:
            q = q.filter(models.ItemInstance.resolved_at != None)
        else:
            q = q.filter(models.ItemInstance.resolved_at == None)
    items = q.order_by(desc(models.ItemInstance.created_at)).all()
    return items


@router.post("/reindex")
def reindex_reports(db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    """Ensure every stored report with a resolvable image is in the ML gallery.

    Returns per-report outcomes; reports that cannot be indexed are listed with a reason.
    """
    from src.api.routers.retrieval import get_retrieval_service
    from src.api.services.index_sync import sync_reports_to_index
    try:
        return sync_reports_to_index(db, get_retrieval_service())
    except Exception:
        raise HTTPException(status_code=503, detail={"code": "ML_UNAVAILABLE",
                                                     "message": "ML service unavailable for reindex"})
