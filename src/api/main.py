from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from src.api.routers import retrieval, reports, users, claims, admin
from src.api.database import engine, get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import Depends, HTTPException
from src.api.config import settings
import os

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    retrieval.router,
    prefix=f"{settings.API_V1_STR}/retrieval",
    tags=["retrieval"]
)

app.include_router(
    reports.router,
    prefix=f"{settings.API_V1_STR}/reports",
    tags=["reports"]
)

app.include_router(
    users.router,
    prefix=f"{settings.API_V1_STR}/users",
    tags=["users"]
)

app.include_router(
    claims.router,
    prefix=f"{settings.API_V1_STR}/claims",
    tags=["claims"]
)

app.include_router(
    admin.router,
    prefix=f"{settings.API_V1_STR}",
)

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database unavailable")
