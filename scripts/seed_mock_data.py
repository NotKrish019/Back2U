import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.database import SessionLocal
from src.api.models import User, Report, ItemInstance, CandidateMatch, Claim

def seed_db():
    db = SessionLocal()
    
    # 1. Create a dummy user
    dummy_uid = "DUMMY_UID_12345"
    user = User(
        firebase_uid=dummy_uid,
        email="student@university.edu",
        display_name="Test Student",
        is_admin="false"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 2. Create an admin user for ourselves to test
    admin_uid = "ADMIN_UID_999"
    admin = User(
        firebase_uid=admin_uid,
        email="admin@university.edu",
        display_name="Staff Member",
        is_admin="true"
    )
    db.add(admin)
    db.commit()

    # 3. Create a Lost Report
    lost_report_id = f"LR-{str(uuid.uuid4())[:8].upper()}"
    lost_report = Report(
        report_id=lost_report_id,
        user_id=user.id,
        report_type="lost",
        item_category="Laptop",
        description="Silver MacBook Pro with a sticker",
        location="Library Cafe",
        image_reference="/mocks/lost_macbook.jpg",
        status="open"
    )
    db.add(lost_report)
    
    # 4. Create a Found Report
    found_report_id = f"FR-{str(uuid.uuid4())[:8].upper()}"
    found_report = Report(
        report_id=found_report_id,
        user_id=user.id, # In reality it's someone else, but keeping it simple
        report_type="found",
        item_category="Laptop",
        description="Found a silver MacBook on a table",
        location="Library 2nd Floor",
        image_reference="/mocks/found_macbook.jpg",
        status="open"
    )
    db.add(found_report)
    db.commit()
    
    # 5. Create a Candidate Match
    match_id = f"MT-{str(uuid.uuid4())[:8].upper()}"
    match = CandidateMatch(
        match_id=match_id,
        lost_report_id=lost_report_id,
        found_report_id=found_report_id,
        similarity_score=0.95,
        status="pending"
    )
    db.add(match)
    
    # Create an uncertain match
    uncertain_match_id = f"MT-{str(uuid.uuid4())[:8].upper()}"
    uncertain_match = CandidateMatch(
        match_id=uncertain_match_id,
        lost_report_id=lost_report_id,
        found_report_id=found_report_id,
        similarity_score=0.65,
        status="pending"
    )
    db.add(uncertain_match)
    db.commit()
    
    # 6. Create a Claim
    claim_id = f"CL-{str(uuid.uuid4())[:8].upper()}"
    claim = Claim(
        claim_id=claim_id,
        report_id=found_report_id,
        claimer_user_id=user.firebase_uid,
        proof_text="The serial number is C02XD34V. The sticker is a GitHub logo.",
        status="pending"
    )
    db.add(claim)
    db.commit()
    
    print("Database seeded with mock data successfully.")
    
if __name__ == "__main__":
    seed_db()
