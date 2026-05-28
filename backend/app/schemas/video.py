from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class VideoCreate(BaseModel):
    idea_id: Optional[uuid.UUID] = None
    script_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    duration_seconds: Optional[int] = None


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None


class VideoResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    idea_id: Optional[uuid.UUID]
    script_id: Optional[uuid.UUID]
    status: str
    title: str
    description: Optional[str]
    file_path: Optional[str]
    thumbnail_path: Optional[str]
    duration_seconds: Optional[int]
    resolution_width: int
    resolution_height: int
    fps: int
    file_size_bytes: Optional[int]
    is_duplicate: bool
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
