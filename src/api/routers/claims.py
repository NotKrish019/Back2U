from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from src.api.database import get_db
from src.api.auth import get_current_user
from src.api.models import User, Report, Claim

router = APIRouter()

class ClaimCreate(BaseModel):
    report_id: str
    proof_text: str

class ClaimOut(BaseModel):
    claim_id: str
    report_id: str
    status: str
    proof_text: str

    class Config:
        from_attributes = True

@router.post("", response_model=ClaimOut, status_code=201)
def create_claim(
    claim_data: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify the target report exists and is a "found" report
    report = db.query(Report).filter(Report.report_id == claim_data.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail={"code": "REPORT_NOT_FOUND",
                                                     "message": "Target report not found."})
    if report.report_type != "found":
        raise HTTPException(status_code=400, detail={"code": "NOT_A_FOUND_REPORT",
                                                     "message": "You can only claim 'found' reports."})
    if report.user_id == current_user.id:
        raise HTTPException(status_code=400, detail={"code": "OWN_REPORT",
                                                     "message": "You cannot claim your own found report."})
    if report.status != "open":
        raise HTTPException(status_code=409, detail={"code": "REPORT_NOT_OPEN",
                                                     "message": "This item has already been returned or closed."})
    if not (claim_data.proof_text or "").strip():
        raise HTTPException(status_code=400, detail={"code": "PROOF_REQUIRED",
                                                     "message": "Describe something only the owner would know."})

    # One active claim per user and report (pending or already approved)
    existing_claim = db.query(Claim).filter(
        Claim.report_id == claim_data.report_id,
        Claim.claimer_user_id == current_user.id,
        Claim.status.in_(["pending", "approved"])
    ).first()
    if existing_claim:
        raise HTTPException(status_code=409, detail={"code": "DUPLICATE_CLAIM",
                                                     "message": "You already have a claim for this report."})

    new_claim = Claim(
        report_id=claim_data.report_id,
        claimer_user_id=current_user.id,
        proof_text=claim_data.proof_text,
        status="pending"
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim

@router.get("", response_model=List[ClaimOut])
def get_my_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    claims = db.query(Claim).filter(Claim.claimer_user_id == current_user.id).all()
    return claims
