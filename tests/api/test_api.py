from fastapi.testclient import TestClient
from src.api.main import app
from src.api.config import settings

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": f"Welcome to {settings.PROJECT_NAME} API"}

def test_search_retrieval():
    response = client.post(
        f"{settings.API_V1_STR}/retrieval/search",
        json={"text": "black backpack", "top_k": 3}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["model_version"] == "mock-v0.1.0"
    assert len(data["results"]) == 3
    assert data["results"][0]["similarity_score"] > data["results"][1]["similarity_score"]

def test_search_retrieval_invalid():
    response = client.post(
        f"{settings.API_V1_STR}/retrieval/search",
        json={"top_k": 3}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "INVALID_QUERY"

def test_create_report():
    response = client.post(
        f"{settings.API_V1_STR}/reports",
        json={
            "report_type": "lost",
            "item_category": "backpack",
            "description": "A black backpack lost in library"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["report_type"] == "lost"
    assert data["report_id"].startswith("rep_")
    assert data["status"] == "open"
