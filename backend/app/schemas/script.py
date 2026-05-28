from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class ScriptCreate(BaseModel):
    idea_id: uuid.UUID
    hook_type: Optional[str] = None
    hook_text: Optional[str] = None
    body_text: Optional[str] = None
    payoff_text: Optional[str] = None
    call_to_action: Optional[str] = None
    full_script: str
    estimated_duration_seconds: int = 30
    scene_breakdown: Optional[str] = None


class ScriptUpdate(BaseModel):
    hook_type: Optional[str] = None
    hook_text: Optional[str] = None
    body_text: Optional[str] = None
    payoff_text: Optional[str] = None
    call_to_action: Optional[str] = None
    full_script: Optional[str] = None
    estimated_duration_seconds: Optional[int] = None
    scene_breakdown: Optional[str] = None


class ScriptResponse(BaseModel):
    id: uuid.UUID
    idea_id: uuid.UUID
    hook_type: Optional[str]
    hook_text: Optional[str]
    body_text: Optional[str]
    payoff_text: Optional[str]
    call_to_action: Optional[str]
    full_script: str
    estimated_duration_seconds: int
    scene_breakdown: Optional[str]
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
