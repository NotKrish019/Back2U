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
    
    # Auto-match logic using REAL ML MODEL
    try:
        from src.api.routers.retrieval import get_retrieval_service
        from src.api.schemas import RetrievalQuery
        
        retrieval_service = get_retrieval_service()
        
        # Dynamically add the new report's image to the ML model's FAISS index
        if report.image_reference and report.image_reference.startswith("data:image"):
            retrieval_service.index_report(db_report, report.image_reference)
            
        # Pass the image and description to the ML model
        query = RetrievalQuery(
            image=report.image_reference,
            text=report.description,
            top_k=5
        )
        
        ml_result = retrieval_service.search(query)
        
        for item in ml_result.results:
            match_report = db.query(models.Report).filter(
                models.Report.item_instance_id == item.item_instance_id,
                models.Report.report_type != report.report_type,
                models.Report.status == "open"
            ).first()
            
            if match_report:
                lost_id = db_report.report_id if db_report.report_type == "lost" else match_report.report_id
                found_id = match_report.report_id if db_report.report_type == "lost" else db_report.report_id
                
                existing_match = db.query(models.CandidateMatch).filter(
                    models.CandidateMatch.lost_report_id == lost_id,
                    models.CandidateMatch.found_report_id == found_id
                ).first()
                
                if not existing_match:
                    new_match = models.CandidateMatch(
                        lost_report_id=lost_id,
                        found_report_id=found_id,
                        similarity_score=item.similarity_score,
                        status="pending"
                    )
                    db.add(new_match)
        db.commit()
    except Exception as e:
        print(f"ML auto-match failed: {e}")
        
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
                        "image_reference": f"BLURRED_{fr.image_reference}" if fr.image_reference else None,
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
