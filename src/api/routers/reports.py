from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from src.api import models, schemas
from src.api.database import get_db
from src.api.auth import get_current_user

router = APIRouter()

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
    
    db_report = models.Report(
        report_type=report.report_type,
        item_instance_id=db_item.item_instance_id,
        item_category=report.item_category,
        description=report.description,
        image_reference=report.image_reference,
        attributes=json.dumps(report.attributes) if report.attributes else None,
        location=report.location,
        user_id=current_user.id
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("", response_model=List[schemas.ReportOut])
def list_reports(
    report_type: Optional[str] = Query(None, description="Filter by 'lost' or 'found'"),
    status: Optional[str] = Query(None, description="Filter by status e.g. 'open'"),
    db: Session = Depends(get_db)
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
        
    return query.all()

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
        
    report.report_type = update_data.report_type
    report.item_category = update_data.item_category
    report.description = update_data.description
    report.image_reference = update_data.image_reference
    report.location = update_data.location
    if update_data.attributes:
        report.attributes = json.dumps(update_data.attributes)
        
    db.commit()
    db.refresh(report)
    return report

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
        
    db.delete(report)
    db.commit()
    return None
