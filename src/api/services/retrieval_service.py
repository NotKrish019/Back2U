from typing import List
from src.api.schemas import RetrievalQuery, RetrievalResult, RetrievalResultItem
import random

class RetrievalService:
    def search(self, query: RetrievalQuery) -> RetrievalResult:
        raise NotImplementedError()

class MockRetrievalService(RetrievalService):
    def search(self, query: RetrievalQuery) -> RetrievalResult:
        # Mock logic to return candidates
        results = []
        for i in range(query.top_k):
            # Generate fake item IDs and descending scores
            results.append(RetrievalResultItem(
                item_instance_id=f"item_mock_{random.randint(1000, 9999)}",
                similarity_score=round(max(0.1, 0.99 - (i * 0.05)), 2),
                rank=i + 1
            ))
            
        return RetrievalResult(
            model_version="mock-v0.1.0",
            results=results
        )
