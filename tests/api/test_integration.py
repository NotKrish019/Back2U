from fastapi.testclient import TestClient
from src.api.main import app
from src.api.config import settings
from src.api.services.retrieval_service import MockRetrievalService
from src.api.routers import retrieval
import json

client = TestClient(app)

def test_real_retrieval_contract():
    # Inject a dummy item into the RealRetrievalService's FAISS index so it has something to return
    import numpy as np
    from src.api.routers.retrieval import real_retrieval_service
    dummy_emb = np.random.randn(128).astype(np.float32)
    real_retrieval_service.index.add_item(
        item_instance_id="dummy_item_001",
        embedding=dummy_emb,
        metadata={"category": "test"}
    )
    real_retrieval_service.index.add_item(
        item_instance_id="dummy_item_002",
        embedding=dummy_emb,
        metadata={"category": "test"}
    )
    real_retrieval_service.index.add_item(
        item_instance_id="dummy_item_003",
        embedding=dummy_emb,
        metadata={"category": "test"}
    )

    # Test Top-K handling and verify the JSON contract
    response = client.post(
        f"{settings.API_V1_STR}/retrieval/search",
        json={"text": "a generic item", "top_k": 3}
    )
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    data = response.json()
    
    # Contract Verification
    assert "model_version" in data
    assert data["model_version"] == "mir-siamese-v0.1.0"
    assert "results" in data
    assert len(data["results"]) == 3
    
    for i, res in enumerate(data["results"]):
        assert "item_instance_id" in res
        assert "similarity_score" in res
        assert "rank" in res
        assert res["rank"] == i + 1

def test_invalid_retrieval_request():
    response = client.post(
        f"{settings.API_V1_STR}/retrieval/search",
        json={"top_k": 5}
    )
    # The API should reject requests without text or image
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert data["detail"]["code"] == "INVALID_QUERY"

def test_valid_report_creation():
    response = client.post(
        f"{settings.API_V1_STR}/reports",
        json={
            "report_type": "lost",
            "item_category": "laptop",
            "description": "Silver macbook",
            "location": "North Hall"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["report_type"] == "lost"
    assert data["status"] == "open"
    assert data["report_id"].startswith("rep_")

def test_invalid_report_creation():
    # Missing required field "report_type"
    response = client.post(
        f"{settings.API_V1_STR}/reports",
        json={
            "item_category": "laptop",
            "description": "Silver macbook"
        }
    )
    assert response.status_code == 422 # FastAPI built-in validation error
