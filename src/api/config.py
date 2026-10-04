import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multimodal Instance Retrieval"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    ML_SERVICE_URL: str = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:8001")
    ENVIRONMENT: str = "production"
    class Config:
        env_file = ".env"

settings = Settings()
