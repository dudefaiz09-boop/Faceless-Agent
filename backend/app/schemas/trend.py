from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class TrendCreate(BaseModel):
    niche_id: Optional[uuid.UUID] = None
    trend_name: str
    category: Optional[str] = None
    reason: Optional[str] = None
    audience_emotion: Optional[str] = None
    virality_score: float = 0.0
    competition_score: float = 0.0
    originality_angle: Optional[str] = None
    suggested_hook: Optional[str] = None
    suggested_title: Optional[str] = None
    suggested_hashtags: Optional[str] = None
    risk_notes: Optional[str] = None
    source: Optional[str] = None


class TrendResponse(BaseModel):
    id: uuid.UUID
    niche_id: Optional[uuid.UUID]
    trend_name: str
    category: Optional[str]
    reason: Optional[str]
    audience_emotion: Optional[str]
    virality_score: float
    competition_score: float
    originality_angle: Optional[str]
    suggested_hook: Optional[str]
    suggested_title: Optional[str]
    suggested_hashtags: Optional[str]
    risk_notes: Optional[str]
    source: Optional[str]
    is_used: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
