from fastapi import APIRouter, HTTPException, Depends
from src.api.schemas import RetrievalQuery, RetrievalResult
from src.api.services.retrieval_service import MockRetrievalService, RetrievalService

router = APIRouter()

def get_retrieval_service() -> RetrievalService:
    # Later this can be swapped out with RealRetrievalService based on config
    return MockRetrievalService()

@router.post("/search", response_model=RetrievalResult)
def search(query: RetrievalQuery, service: RetrievalService = Depends(get_retrieval_service)):
    if not query.image and not query.text:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_QUERY",
                "message": "A query image or text is required."
            }
        )
    try:
        return service.search(query)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "RETRIEVAL_FAILED",
                "message": str(e)
            }
        )
