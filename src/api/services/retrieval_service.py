from typing import List
from src.api.schemas import RetrievalQuery, RetrievalResult, RetrievalResultItem
import random
from src.api.config import settings

class RetrievalService:
    def search(self, query: RetrievalQuery) -> RetrievalResult:
        raise NotImplementedError()

class MockRetrievalService(RetrievalService):
    def search(self, query: RetrievalQuery) -> RetrievalResult:
        # ML is not connected yet; do not fabricate matches.
        return RetrievalResult(
            model_version="ml-pending",
            results=[]
        )

class RealRetrievalService(RetrievalService):
    def __init__(self):
        self.ml_url = settings.ML_SERVICE_URL

    def search(self, query: RetrievalQuery) -> RetrievalResult:
        import requests
        import base64
        import io
        
        # We need to send a file to the ML service endpoint
        # ML service expects: POST /api/search with multipart/form-data containing 'file'
        
        files = {}
        if query.image and query.image.startswith("data:image"):
            # Decode the base64 image
            header, encoded = query.image.split(",", 1)
            img_data = base64.b64decode(encoded)
            files["file"] = ("query_image.jpg", io.BytesIO(img_data), "image/jpeg")
        data = {}
        if query.text:
            data["text"] = query.text
            
        if not files and not data:
            raise ValueError("RealRetrievalService requires an image or text query.")

        try:
            resp = requests.post(f"{self.ml_url}/api/search", files=files, data=data, timeout=60)
            resp.raise_for_status()
            ml_data = resp.json()
        except Exception as e:
            raise RuntimeError(f"Failed to communicate with ML Service: {str(e)}")

        # ML returns {"query_img": ..., "results": [{"item_instance_id": ..., "similarity_score": ..., "rank": ...}]}
        
        results = []
        for res in ml_data.get("results", []):
            results.append(RetrievalResultItem(
                item_instance_id=res["item_instance_id"],
                similarity_score=round(res["similarity_score"], 4),
                rank=res["rank"]
            ))
            
        return RetrievalResult(
            model_version="mir-siamese-v0.1.0", # Can be extracted from ML response if the ML service provides it
            results=results
        )


