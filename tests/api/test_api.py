from fastapi.testclient import TestClient
from src.api.main import app
from src.api.config import settings
from src.api.auth import get_current_user
from src.api.models import User
from src.api.database import SessionLocal

client = TestClient(app)

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
    assert data["model_version"] == "ml-pending"
    assert len(data["results"]) == 0

def test_search_retrieval_invalid():
    response = client.post(
        f"{settings.API_V1_STR}/retrieval/search",
        json={"top_k": 3}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "A query image or text is required."

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
