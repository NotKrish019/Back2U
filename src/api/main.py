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


@app.exception_handler(Exception)
async def _unhandled_error(request, exc):  # never leak stack traces or internals to clients
    import logging
    logging.getLogger("back2u.api").exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": {"code": "INTERNAL_ERROR",
                        "message": "Something went wrong on our side. Please try again."}})

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


@app.on_event("startup")
def sync_ml_gallery_on_startup():
    """Make sure reports stored in the DB are present in the ML gallery after any restart."""
    if os.getenv("BACKEND_INDEX_SYNC_ON_STARTUP", "1") != "1":
        return
    from src.api.database import SessionLocal
    from src.api.routers.retrieval import get_retrieval_service
    from src.api.services.index_sync import start_background_sync
    start_background_sync(SessionLocal, get_retrieval_service)
