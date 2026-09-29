import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.models import User
from src.api.auth import get_current_user
from src.api.database import get_db

client = TestClient(app)

class MockUser:
    def __init__(self, is_admin="true"):
        self.id = "test_usr"
        self.is_admin = is_admin
        self.firebase_uid = "test_uid"

def override_get_current_user_admin():
    return MockUser(is_admin="true")

def override_get_current_user_normal():
    return MockUser(is_admin="false")

def test_admin_overview():
    app.dependency_overrides[get_current_user] = override_get_current_user_admin
    response = client.get("/api/v1/admin/overview")
    assert response.status_code == 200
    data = response.json()
    assert "pending_claims" in data

def test_admin_claims():
    app.dependency_overrides[get_current_user] = override_get_current_user_admin
    response = client.get("/api/v1/admin/claims")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_admin_candidates():
    app.dependency_overrides[get_current_user] = override_get_current_user_admin
    response = client.get("/api/v1/admin/candidates")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_admin_unauthorized():
    app.dependency_overrides[get_current_user] = override_get_current_user_normal
    response = client.get("/api/v1/admin/overview")
    assert response.status_code == 403
    app.dependency_overrides.pop(get_current_user, None)
