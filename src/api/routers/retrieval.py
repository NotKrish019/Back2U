from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from src.api.schemas import RetrievalQuery, RetrievalResult, RetrievalResultItem
from src.api.services.retrieval_service import RetrievalService, MockRetrievalService
from src.api.database import get_db
from src.api.auth import get_current_user
from src.api.models import User, Report, CandidateMatch

router = APIRouter()

mock_retrieval_service = MockRetrievalService()

def get_retrieval_service() -> RetrievalService:
    return mock_retrieval_service

@router.post("/search", response_model=RetrievalResult)
def search(
    query: RetrievalQuery, 
    service: RetrievalService = Depends(get_retrieval_service),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not query.image and not query.text:
        raise HTTPException(status_code=400, detail="A query image or text is required.")
        
    try:
        # 1. Ask ML for raw candidates
        ml_result = service.search(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Retrieval failed: {str(e)}")

    # 2. Enrich candidates using PostgreSQL database (ML Integration Boundary)
    enriched_results = []
    
    for item in ml_result.results:
        # The ML engine returns item_instance_id. We fetch the corresponding Report.
        # We assume for this query we want opposite reports (if searching for a lost item, show found items).
        report = db.query(Report).filter(Report.item_instance_id == item.item_instance_id).first()
        
        if report:
            # Enforce privacy constraints: blur image for found items
            image_ref = report.image_reference
            if report.report_type == "found" and image_ref:
                image_ref = f"BLURRED_{image_ref}" # Abstracted for the UI
                
            # Populate the enriched Back2U result
            enriched_item = RetrievalResultItem(
                item_instance_id=item.item_instance_id,
                similarity_score=item.similarity_score,
                rank=item.rank,
                report_id=report.report_id,
                report_type=report.report_type,
                item_category=report.item_category,
                location=report.location,
                image_reference=image_ref,
                status=report.status
            )
            enriched_results.append(enriched_item)
            
            # Optional: Persist the candidate match in the database for later review
            # Assuming this was a search originating from a new Lost report
            # We would need the source report_id, which isn't in RetrievalQuery right now.
            # So we skip CandidateMatch creation here until RetrievalQuery includes `source_report_id`.
        else:
            # If no report found in DB (e.g. mock data mismatch), return ML data as is
            enriched_results.append(item)

    return RetrievalResult(
        model_version=ml_result.model_version,
        results=enriched_results
    )

