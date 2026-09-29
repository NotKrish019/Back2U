from fastapi.testclient import TestClient
from src.api.main import app
from src.api.config import settings
from src.api.services.retrieval_service import MockRetrievalService
from src.api.routers import retrieval
import json

from src.api.auth import get_current_user
from src.api.models import User
from src.api.database import SessionLocal

def mock_get_current_user():
    db = SessionLocal()
    user = db.query(User).filter(User.id == "test_user_id").first()
    if not user:
        user = User(id="test_user_id", firebase_uid="test_uid", email="test@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return user

app.dependency_overrides[get_current_user] = mock_get_current_user

def test_invalid_retrieval_request(client):
    response = client.post(
        f"{settings.API_V1_STR}/retrieval/search",
        json={"top_k": 5},
        headers={"Authorization": "Bearer TEST_TOKEN_123"}
    )
    # The API should reject requests without text or image
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert data["detail"] == "A query image or text is required."

def test_valid_report_creation(client):
    response = client.post(
        f"{settings.API_V1_STR}/reports",
        json={
            "report_type": "lost",
            "item_category": "laptop",
            "description": "Silver macbook",
            "location": "North Hall"
        },
        headers={"Authorization": "Bearer TEST_TOKEN_123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["report_type"] == "lost"
    assert data["status"] == "open"
    assert data["report_id"].startswith("rep_")

def test_invalid_report_creation(client):
    # Missing required field "report_type"
    response = client.post(
        f"{settings.API_V1_STR}/reports",
        json={
            "item_category": "laptop",
            "description": "Silver macbook"
        },
        headers={"Authorization": "Bearer TEST_TOKEN_123"}
    )
    assert response.status_code == 422 # FastAPI built-in validation error
