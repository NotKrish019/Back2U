import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.config import settings
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

@pytest.fixture(autouse=True)
def _authenticated_user():
    # Set per test: other test modules change/remove this override.
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)

def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": f"Welcome to {settings.PROJECT_NAME} API"}

def test_search_retrieval(client):
    # Use the offline mock so the test does not need the ML service on port 8001.
    from src.api.routers import retrieval
    from src.api.services.retrieval_service import MockRetrievalService, MOCK_MODEL_VERSION
    previous = retrieval.get_retrieval_service()
    retrieval.set_retrieval_service(MockRetrievalService())
    try:
        response = client.post(
            f"{settings.API_V1_STR}/retrieval/search",
            json={"text": "black backpack", "top_k": 3},
            headers={"Authorization": "Bearer TEST_TOKEN_123"}
        )
    finally:
        retrieval.set_retrieval_service(previous)
    assert response.status_code == 200
    data = response.json()
    assert data["model_version"] == MOCK_MODEL_VERSION
    assert isinstance(data["results"], list)

def test_search_retrieval_invalid(client):
    response = client.post(
        f"{settings.API_V1_STR}/retrieval/search",
        json={"top_k": 3},
        headers={"Authorization": "Bearer TEST_TOKEN_123"}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "A query image or text is required."

def test_create_report(client):
    response = client.post(
        f"{settings.API_V1_STR}/reports",
        json={
            "report_type": "lost",
            "item_category": "backpack",
            "description": "A black backpack lost in library"
        },
        headers={"Authorization": "Bearer TEST_TOKEN_123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["report_type"] == "lost"
    assert data["report_id"].startswith("rep_")
    assert data["status"] == "open"
