import sys
import os

# Add the parent directory to sys.path to allow imports from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database import SessionLocal
from src.api.models import User

def create_admin(firebase_uid, email, display_name):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        if not user:
            print(f"Creating new user {email}...")
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                display_name=display_name,
                is_admin="true"
            )
            db.add(user)
        else:
            print(f"User {email} already exists. Upgrading to admin...")
            user.is_admin = "true"
        db.commit()
        print(f"Success! {email} is now an admin.")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/create_admin.py <firebase_uid> [email] [display_name]")
        print("Note: To find a firebase_uid, create an account normally via the frontend, then look in the 'users' table.")
        sys.exit(1)
        
    uid = sys.argv[1]
    email = sys.argv[2] if len(sys.argv) > 2 else f"admin_{uid}@example.com"
    name = sys.argv[3] if len(sys.argv) > 3 else "Staff Admin"
    
    create_admin(uid, email, name)
