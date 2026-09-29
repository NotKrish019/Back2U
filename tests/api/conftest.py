import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

import os
# Ensure tests use a separate test database
os.environ["DATABASE_URL"] = "sqlite:///./test_app.db"

# Now we can safely import our app modules
from src.api.main import app
from src.api.database import Base, get_db, engine
from src.api.config import settings

# Bind the engine from database.py to our models
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Create all tables in the test database
    Base.metadata.create_all(bind=engine)
    yield
    # Drop all tables after all tests finish
    Base.metadata.drop_all(bind=engine)
    # Remove the sqlite file
    if os.path.exists("./test_app.db"):
        os.remove("./test_app.db")

@pytest.fixture
def client():
    return TestClient(app)
