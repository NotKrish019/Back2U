import os
import sys
import logging
from sqlalchemy import text
from sqlalchemy.engine.url import make_url

# Add the project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database import SessionLocal, engine
from src.api.models import User, Report, ItemInstance
from src.api.config import settings

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

def run_tests():
    # A. Which database the current DATABASE_URL is targeting
    url = make_url(settings.DATABASE_URL)
    host = url.host
    logger.info(f"Target Host: {host}")
    
    # B. Whether the connection is Supabase
    if host and "supabase.com" in host:
        logger.info("Connection is verified as Supabase.")
    else:
        logger.info("Connection is NOT Supabase.")
        
    # Check tables
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    logger.info(f"Tables present in DB: {', '.join(tables)}")
    
    db = SessionLocal()
    test_firebase_uid = "TEST_FIREBASE_UID_CRUD_123"
    
    try:
        # C. Whether INSERT worked
        new_user = User(firebase_uid=test_firebase_uid, email="test@example.com", display_name="Test User")
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"INSERT: Success")
        
        # D. Whether SELECT worked
        selected_user = db.query(User).filter(User.firebase_uid == test_firebase_uid).first()
        if selected_user and selected_user.email == "test@example.com":
            logger.info("SELECT: Success")
        else:
            logger.info("SELECT: Failed")
            
        # E. Whether UPDATE worked
        selected_user.display_name = "Updated Test User"
        db.commit()
        db.refresh(selected_user)
        
        check_user = db.query(User).filter(User.firebase_uid == test_firebase_uid).first()
        if check_user and check_user.display_name == "Updated Test User":
            logger.info("UPDATE: Success")
        else:
            logger.info("UPDATE: Failed")
            
        # F. Whether DELETE/rollback worked
        db.delete(check_user)
        db.commit()
        
        # G. Whether any test data remains
        final_check = db.query(User).filter(User.firebase_uid == test_firebase_uid).first()
        if final_check is None:
            logger.info("DELETE: Success (No test data remains)")
        else:
            logger.info("DELETE: Failed (Test data remains)")
            
    except Exception as e:
        logger.error(f"ERROR during CRUD: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
