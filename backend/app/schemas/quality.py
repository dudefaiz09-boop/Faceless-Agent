from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class QualityScoreResponse(BaseModel):
    id: uuid.UUID
    video_id: uuid.UUID
    hook_strength: float
    retention_potential: float
    visual_quality: float
    audio_quality: float
    originality: float
    platform_compliance: float
    caption_readability: float
    trend_relevance: float
    shareability: float
    saveability: float
    brand_safety: float
    monetization_suitability: float
    overall_score: float
    details_json: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
