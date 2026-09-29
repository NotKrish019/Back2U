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

@router.patch("/claims/{claim_id}")
def update_claim(claim_id: str, update: StatusUpdate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_admin_user)):
    claim = db.query(models.Claim).filter(models.Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = update.status
    db.commit()
    db.refresh(claim)
    return {"claim_id": claim.claim_id, "status": claim.status}

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
        raise HTTPException(status_code=404, detail="Candidate Match not found")
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
