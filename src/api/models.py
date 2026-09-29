from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from src.api.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True, default=lambda: f"usr_{uuid.uuid4().hex[:8]}")
    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    is_admin = Column(String, default="false") # "true" or "false" to avoid boolean dialect issues with sqlite/postgres if we don't have migrations ready
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    reports = relationship("Report", back_populates="owner")
    claims = relationship("Claim", back_populates="claimer")

class ItemInstance(Base):
    __tablename__ = "item_instances"
    
    item_instance_id = Column(String, primary_key=True, index=True, default=lambda: f"item_{uuid.uuid4().hex[:8]}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    reports = relationship("Report", back_populates="item_instance")

class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, index=True, default=lambda: f"rep_{uuid.uuid4().hex[:8]}")
    report_type = Column(String, index=True) # 'lost' or 'found'
    item_instance_id = Column(String, ForeignKey("item_instances.item_instance_id"), index=True, nullable=True)
    item_category = Column(String, index=True, nullable=True)
    description = Column(Text, nullable=True)
    image_reference = Column(String, nullable=True)
    attributes = Column(Text, nullable=True) # JSON string
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=True)
    status = Column(String, default="open") # open, resolved, closed

    owner = relationship("User", back_populates="reports")
    item_instance = relationship("ItemInstance", back_populates="reports")
    claims = relationship("Claim", back_populates="report")
    
    lost_matches = relationship("CandidateMatch", foreign_keys="CandidateMatch.lost_report_id", back_populates="lost_report")
    found_matches = relationship("CandidateMatch", foreign_keys="CandidateMatch.found_report_id", back_populates="found_report")

class CandidateMatch(Base):
    __tablename__ = "candidate_matches"

    match_id = Column(String, primary_key=True, index=True, default=lambda: f"match_{uuid.uuid4().hex[:8]}")
    lost_report_id = Column(String, ForeignKey("reports.report_id"), index=True, nullable=False)
    found_report_id = Column(String, ForeignKey("reports.report_id"), index=True, nullable=False)
    similarity_score = Column(Float, nullable=False)
    status = Column(String, default="pending") # pending, accepted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lost_report = relationship("Report", foreign_keys=[lost_report_id], back_populates="lost_matches")
    found_report = relationship("Report", foreign_keys=[found_report_id], back_populates="found_matches")

class Claim(Base):
    __tablename__ = "claims"

    claim_id = Column(String, primary_key=True, index=True, default=lambda: f"claim_{uuid.uuid4().hex[:8]}")
    report_id = Column(String, ForeignKey("reports.report_id"), index=True, nullable=False)
    claimer_user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    status = Column(String, default="pending") # pending, approved, denied
    proof_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship("Report", back_populates="claims")
    claimer = relationship("User", back_populates="claims")

class ReportEmbedding(Base):
    __tablename__ = "report_embeddings"
    
    embedding_id = Column(String, primary_key=True, index=True, default=lambda: f"emb_{uuid.uuid4().hex[:8]}")
    report_id = Column(String, ForeignKey("reports.report_id"), index=True, nullable=False)
    model_version = Column(String, nullable=False)
    # vector_data will be added via pgvector once ML dimension is finalized
    created_at = Column(DateTime(timezone=True), server_default=func.now())
