import logging
import sys
import os

# Add the project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from src.api.database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def test_connection():
    logger.info("Attempting to connect to the database...")
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            assert result.scalar() == 1
            logger.info("✅ Database connection successful!")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_connection()
