"""Seed comprehensive demo database covering all canonical categories and edge cases.

Categories covered:
- laptop
- mobile_phone
- wallet
- earphones
- headphones
- keys
- book
- non-canonical items (e.g. backpack, bottle)
- report states: open, closed/resolved
"""
import base64
import io
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src.api.database import SessionLocal
from src.api.models import User, Report, ItemInstance, CandidateMatch, Claim
from src.categories import CANONICAL_CATEGORIES, normalize_category

def create_sample_image_data_url(color=(100, 100, 200), text_desc="item"):
    img = Image.new("RGB", (224, 224), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

def seed():
    db = SessionLocal()
    print("Seeding comprehensive demo database...", flush=True)
    
    # 1. Clean existing records or normalize categories
    for r in db.query(Report).all():
        if r.item_category:
            canon = normalize_category(r.item_category)
            if canon:
                r.item_category = canon
    db.commit()

    # 2. Users
    user1 = db.query(User).filter(User.email == "alice@university.edu").first()
    if not user1:
        user1 = User(
            firebase_uid="UID_ALICE_101",
            email="alice@university.edu",
            display_name="Alice Smith",
            is_admin="false"
        )
        db.add(user1)
        
    user2 = db.query(User).filter(User.email == "bob@university.edu").first()
    if not user2:
        user2 = User(
            firebase_uid="UID_BOB_102",
            email="bob@university.edu",
            display_name="Bob Jones",
            is_admin="false"
        )
        db.add(user2)
        
    admin = db.query(User).filter(User.email == "campus_security@university.edu").first()
    if not admin:
        admin = User(
            firebase_uid="UID_ADMIN_999",
            email="campus_security@university.edu",
            display_name="Campus Security Desk",
            is_admin="true"
        )
        db.add(admin)
    db.commit()
    db.refresh(user1)
    db.refresh(user2)

    demo_pairs = [
        # (category, lost_desc, found_desc, loc_lost, loc_found, color, item_name)
        ("laptop", "Silver Apple MacBook Pro 14 with Docker sticker", "Found silver MacBook on 2nd floor desk", "Library Study Room 3", "Library 2nd Floor", (190, 190, 200), "MacBook Pro"),
        ("mobile_phone", "Midnight blue iPhone 13 in black OtterBox case", "Black iPhone found on dining hall table", "Student Union Dining Hall", "Student Union Main Entrance", (30, 40, 80), "iPhone 13"),
        ("wallet", "Brown leather bifold wallet containing student ID", "Brown leather wallet found near gym lockers", "Recreation Center Locker Room", "Gym Reception", (139, 69, 19), "Leather Wallet"),
        ("earphones", "White AirPods Pro in white wireless charging case", "AirPods in case found on gym treadmill", "Recreation Center Treadmills", "Gym Lost & Found", (240, 240, 245), "AirPods Pro"),
        ("headphones", "Matte black Sony WH-1000XM4 noise cancelling headphones", "Black over-ear headphones left on sofa", "Engineering Building Atrium", "Engineering Hall Office", (20, 20, 20), "Sony Headphones"),
        ("keys", "Toyota key fob on a blue woven lanyard with brass house key", "Set of keys with car fob and blue lanyard", "North Campus Parking Lot B", "Parking Services Office", (70, 130, 180), "Car Keys"),
        ("book", "Calculus Early Transcendentals 9th Edition hardcover", "Thick calculus textbook left on table", "Math Building Lounge", "Math Department Office", (34, 139, 34), "Calculus Textbook"),
    ]

    for cat, lost_desc, found_desc, loc_lost, loc_found, color, item_name in demo_pairs:
        # Check if already seeded
        existing = db.query(Report).filter(Report.description == lost_desc).first()
        if existing:
            continue
            
        inst = ItemInstance()
        db.add(inst)
        db.flush()
        
        lost_img = create_sample_image_data_url(color, item_name)
        found_img = create_sample_image_data_url(color, item_name)
        
        lost_rep = Report(
            report_id=f"LR-{str(uuid.uuid4())[:8].upper()}",
            user_id=user1.id,
            report_type="lost",
            item_instance_id=inst.item_instance_id,
            item_category=cat,
            description=lost_desc,
            location=loc_lost,
            image_reference=lost_img,
            attributes=json.dumps({"brand": item_name, "color": "standard"}),
            status="open"
        )
        found_rep = Report(
            report_id=f"FR-{str(uuid.uuid4())[:8].upper()}",
            user_id=user2.id,
            report_type="found",
            item_instance_id=inst.item_instance_id,
            item_category=cat,
            description=found_desc,
            location=loc_found,
            image_reference=found_img,
            attributes=json.dumps({"brand": item_name, "color": "standard"}),
            status="open"
        )
        db.add(lost_rep)
        db.add(found_rep)
        db.flush()
        
        # Candidate match
        match = CandidateMatch(
            match_id=f"MT-{str(uuid.uuid4())[:8].upper()}",
            lost_report_id=lost_rep.report_id,
            found_report_id=found_rep.report_id,
            similarity_score=0.94,
            status="pending"
        )
        db.add(match)

    # Edge cases:
    # 1. Non-canonical / open-set object: Backpack
    bp_desc = "Black Nike Brasilia training backpack with laptop sleeve"
    if not db.query(Report).filter(Report.description == bp_desc).first():
        inst_bp = ItemInstance()
        db.add(inst_bp)
        db.flush()
        db.add(Report(
            report_id=f"LR-{str(uuid.uuid4())[:8].upper()}",
            user_id=user1.id,
            report_type="lost",
            item_instance_id=inst_bp.item_instance_id,
            item_category=None, # non-canonical
            description=bp_desc,
            location="University Library Cafe",
            image_reference=create_sample_image_data_url((15, 15, 15), "backpack"),
            attributes=json.dumps({"item_name": "backpack", "brand": "Nike"}),
            status="open"
        ))
        
    # 2. Resolved/Closed report: Hydro Flask Water Bottle
    closed_desc = "Dark blue Hydro Flask 32oz water bottle with mountain stickers"
    if not db.query(Report).filter(Report.description == closed_desc).first():
        inst_cl = ItemInstance()
        db.add(inst_cl)
        db.flush()
        db.add(Report(
            report_id=f"FR-{str(uuid.uuid4())[:8].upper()}",
            user_id=user2.id,
            report_type="found",
            item_instance_id=inst_cl.item_instance_id,
            item_category=None,
            description=closed_desc,
            location="Gym Fitness Studio",
            image_reference=create_sample_image_data_url((0, 70, 140), "bottle"),
            attributes=json.dumps({"item_name": "water bottle", "brand": "Hydro Flask"}),
            status="resolved" # Inactive / resolved!
        ))
        
    db.commit()
    
    total_reports = db.query(Report).count()
    total_users = db.query(User).count()
    total_matches = db.query(CandidateMatch).count()
    print(f"Database seeded successfully. Total reports: {total_reports}, users: {total_users}, matches: {total_matches}", flush=True)
    db.close()

if __name__ == "__main__":
    seed()
