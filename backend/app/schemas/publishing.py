from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class PublishingJobCreate(BaseModel):
    video_id: uuid.UUID
    action: str
    platform: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    priority: int = 0


class PublishingJobResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    video_id: Optional[uuid.UUID]
    action: str
    status: str
    platform: Optional[str]
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    retry_count: int
    error_message: Optional[str]
    result_data: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PublishedPostResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    video_id: Optional[uuid.UUID]
    platform: str
    platform_post_id: str
    platform_url: Optional[str]
    title: str
    description: Optional[str]
    hashtags: Optional[str]
    published_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
