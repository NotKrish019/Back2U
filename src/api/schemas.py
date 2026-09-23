from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReportBase(BaseModel):
    report_type: str
    item_category: Optional[str] = None
    description: Optional[str] = None
    image_reference: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    location: Optional[str] = None
    user_id: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportOut(ReportBase):
    report_id: str
    item_instance_id: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        orm_mode = True
        from_attributes = True

class RetrievalQuery(BaseModel):
    image: Optional[str] = None
    text: Optional[str] = None
    top_k: int = 10

class RetrievalResultItem(BaseModel):
    item_instance_id: str
    similarity_score: float
    rank: int

class RetrievalResult(BaseModel):
    model_version: str
    results: List[RetrievalResultItem]
