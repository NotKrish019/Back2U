from sqlalchemy import Column, String, Float, DateTime, Text
from sqlalchemy.sql import func
import uuid
from src.api.database import Base

class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, index=True, default=lambda: f"rep_{uuid.uuid4().hex[:8]}")
    report_type = Column(String, index=True) # 'lost' or 'found'
    item_instance_id = Column(String, index=True, nullable=True)
    item_category = Column(String, index=True, nullable=True)
    description = Column(Text, nullable=True)
    image_reference = Column(String, nullable=True)
    attributes = Column(Text, nullable=True) # JSON string
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(String, index=True, nullable=True)
    status = Column(String, default="open")

class ItemInstance(Base):
    __tablename__ = "item_instances"
    
    item_instance_id = Column(String, primary_key=True, index=True, default=lambda: f"item_{uuid.uuid4().hex[:8]}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
