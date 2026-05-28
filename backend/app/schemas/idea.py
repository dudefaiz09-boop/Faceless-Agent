from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class IdeaCreate(BaseModel):
    niche_id: Optional[uuid.UUID] = None
    trend_id: Optional[uuid.UUID] = None
    video_title: str
    hook_1s: Optional[str] = None
    hook_3s: Optional[str] = None
    full_script: Optional[str] = None
    storyboard: Optional[str] = None
    voiceover_text: Optional[str] = None
    on_screen_text: Optional[str] = None
    broll_prompt: Optional[str] = None
    motion_graphics_prompt: Optional[str] = None
    caption_text: Optional[str] = None
    hashtags: Optional[str] = None
    call_to_action: Optional[str] = None
    estimated_duration: int = 30
    target_audience: Optional[str] = None
    platform_adjustments: Optional[str] = None
    monetization_potential: float = 0.0
    risk_score: float = 0.0


class IdeaUpdate(BaseModel):
    video_title: Optional[str] = None
    hook_1s: Optional[str] = None
    hook_3s: Optional[str] = None
    full_script: Optional[str] = None
    storyboard: Optional[str] = None
    voiceover_text: Optional[str] = None
    on_screen_text: Optional[str] = None
    broll_prompt: Optional[str] = None
    motion_graphics_prompt: Optional[str] = None
    caption_text: Optional[str] = None
    hashtags: Optional[str] = None
    call_to_action: Optional[str] = None
    estimated_duration: Optional[int] = None
    target_audience: Optional[str] = None
    platform_adjustments: Optional[str] = None
    monetization_potential: Optional[float] = None
    risk_score: Optional[float] = None


class IdeaStatusUpdate(BaseModel):
    status: str


class IdeaResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    niche_id: Optional[uuid.UUID]
    trend_id: Optional[uuid.UUID]
    status: str
    video_title: str
    hook_1s: Optional[str]
    hook_3s: Optional[str]
    full_script: Optional[str]
    storyboard: Optional[str]
    voiceover_text: Optional[str]
    on_screen_text: Optional[str]
    broll_prompt: Optional[str]
    motion_graphics_prompt: Optional[str]
    caption_text: Optional[str]
    hashtags: Optional[str]
    call_to_action: Optional[str]
    estimated_duration: int
    target_audience: Optional[str]
    platform_adjustments: Optional[str]
    monetization_potential: float
    risk_score: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
