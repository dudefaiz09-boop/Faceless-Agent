from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class NicheCreate(BaseModel):
    name: str
    description: Optional[str] = None
    priority: int = 0
    content_pillars: Optional[str] = None
    audience_persona: Optional[str] = None
    hook_formulas: Optional[str] = None
    visual_style_guide: Optional[str] = None
    caption_style: Optional[str] = None
    hashtag_style: Optional[str] = None
    monetization_angle: Optional[str] = None
    content_safety_rules: Optional[str] = None


class NicheUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    content_pillars: Optional[str] = None
    audience_persona: Optional[str] = None
    hook_formulas: Optional[str] = None
    visual_style_guide: Optional[str] = None
    caption_style: Optional[str] = None
    hashtag_style: Optional[str] = None
    monetization_angle: Optional[str] = None
    content_safety_rules: Optional[str] = None


class NicheResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    is_active: bool
    priority: int
    pipeline_status: str = "idle"
    last_agent_action: Optional[str] = None
    last_agent_action_at: Optional[str] = None
    content_pillars: Optional[str]
    audience_persona: Optional[str]
    hook_formulas: Optional[str]
    visual_style_guide: Optional[str]
    caption_style: Optional[str]
    hashtag_style: Optional[str]
    monetization_angle: Optional[str]
    content_safety_rules: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
