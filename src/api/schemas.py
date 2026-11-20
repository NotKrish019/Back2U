import json
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

class ReportBase(BaseModel):
    report_type: str
    item_category: Optional[str] = None
    description: Optional[str] = None
    image_reference: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    location: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportOut(ReportBase):
    report_id: str
    item_instance_id: Optional[str] = None
    status: str
    created_at: datetime
    match_count: int = 0
    image_blurred: bool = False

    @field_validator("attributes", mode="before")
    @classmethod
    def _parse_attributes(cls, v):
        # The ORM stores attributes as a JSON string.
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
            except ValueError:
                return {"raw": v}
            return parsed if isinstance(parsed, dict) else {"raw": parsed}
        return v

    class Config:
        orm_mode = True
        from_attributes = True

class RetrievalQuery(BaseModel):
    image: Optional[str] = None
    text: Optional[str] = None
    top_k: int = Field(10, ge=1, le=50)
    # Who is searching: a person who LOST something searches FOUND reports (default),
    # a FOUND report is matched against LOST reports. See src/api/services/matching.py.
    query_type: Literal["lost", "found"] = "lost"
    exclude_report_id: Optional[str] = None

class RetrievalResultItem(BaseModel):
    item_instance_id: str
    similarity_score: float
    rank: int
    decision: Optional[str] = None       # ML decision: candidate | review | reject
    visual_score: Optional[float] = None
    text_score: Optional[float] = None

    # Enriched application data (supplied by backend, not ML)
    report_id: Optional[str] = None
    report_type: Optional[str] = None
    item_category: Optional[str] = None
    location: Optional[str] = None
    image_reference: Optional[str] = None # server-side blurred derivative for 'found' items
    image_blurred: bool = False
    status: Optional[str] = None

class RetrievalResult(BaseModel):
    model_version: str
    results: List[RetrievalResultItem]
    # OK | UNSUPPORTED_ITEM | NO_ELIGIBLE_ITEMS
    status: str = "OK"
    message: Optional[str] = None
    mode: Optional[str] = None            # image | image_text | text_only
    perception: Optional[Dict[str, Any]] = None
