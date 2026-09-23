from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from src.api import models, schemas
from src.api.database import get_db

router = APIRouter()

@router.post("", response_model=schemas.ReportOut, status_code=201)
def create_report(report: schemas.ReportCreate, db: Session = Depends(get_db)):
    if report.report_type not in ["lost", "found"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_REPORT_TYPE",
                "message": "Report type must be 'lost' or 'found'."
            }
        )
    
    db_report = models.Report(
        report_type=report.report_type,
        item_category=report.item_category,
        description=report.description,
        image_reference=report.image_reference,
        attributes=json.dumps(report.attributes) if report.attributes else None,
        location=report.location,
        user_id=report.user_id
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.Report).filter(models.Report.report_id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "REPORT_NOT_FOUND",
                "message": "The requested report was not found."
            }
        )
    return report
