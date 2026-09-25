from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src.api import models, schemas
from src.api.database import get_db
from src.api.auth import get_current_user

router = APIRouter()

@router.get("/me")
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """Retrieve the currently authenticated user's profile."""
    return {
        "id": current_user.id,
        "firebase_uid": current_user.firebase_uid,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "created_at": current_user.created_at
    }

@router.get("/me/reports", response_model=List[schemas.ReportOut])
def get_user_reports(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Retrieve all reports owned by the currently authenticated user."""
    reports = db.query(models.Report).filter(models.Report.user_id == current_user.id).all()
    return reports
