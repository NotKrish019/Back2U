import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from src.api.database import get_db
from src.api.models import User
import os
import logging
from src.api.config import settings

logger = logging.getLogger(__name__)

# Initialize Firebase Admin
try:
    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        project_id = os.getenv("FIREBASE_PROJECT_ID", "liveproject-12091")
        
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {'projectId': project_id})
        else:
            logger.warning("No Firebase credentials found. Initializing with Project ID only for token verification.")
            firebase_admin.initialize_app(options={'projectId': project_id})
except Exception as e:
    logger.error(f"Error initializing Firebase Admin: {e}")

security = HTTPBearer()

import jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # For our integration testing without real Firebase
        if token.startswith("TEST_TOKEN_") and settings.ENVIRONMENT == "test":
            return {"uid": token.replace("TEST_TOKEN_", "TEST_UID_"), "email": "test@example.com"}

        # If we have credentials, verify with Firebase
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            decoded_token = firebase_auth.verify_id_token(token)
            return decoded_token
        else:
            # Fallback for local development when GOOGLE_APPLICATION_CREDENTIALS is not set
            if settings.ENVIRONMENT not in ["development", "test"]:
                raise HTTPException(status_code=500, detail="Server misconfigured: missing Firebase credentials")
            # Decode without signature verification for local testing ONLY
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            project_id = os.getenv("FIREBASE_PROJECT_ID", "liveproject-12091")
            if decoded_token.get("aud") != project_id:
                logger.warning(f"Token audience {decoded_token.get('aud')} does not match project {project_id}")
            return decoded_token
            
    except Exception as e:
        logger.error(f"Firebase auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(decoded_token: dict = Depends(verify_token), db: Session = Depends(get_db)) -> User:
    print(f"DEBUG AUTH: decoded_token type = {type(decoded_token)}")
    print(f"DEBUG AUTH: decoded_token content = {decoded_token}")
    # firebase-admin verify_id_token gives us "uid". Raw JWT gives "user_id" or "sub".
    firebase_uid = decoded_token.get("uid") or decoded_token.get("user_id") or decoded_token.get("sub")
    print(f"DEBUG AUTH: extracted firebase_uid = {firebase_uid}")
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Invalid token structure")
    
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        # Auto-create user in database if they don't exist yet but have a valid Firebase token
        user = User(
            firebase_uid=firebase_uid,
            email=decoded_token.get("email"),
            display_name=decoded_token.get("name")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user

def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.is_admin != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

