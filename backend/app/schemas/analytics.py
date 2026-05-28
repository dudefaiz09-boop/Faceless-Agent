from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class AnalyticsSnapshotResponse(BaseModel):
    id: uuid.UUID
    published_post_id: uuid.UUID
    snapshot_date: datetime
    views: int
    watch_time_seconds: int
    average_view_duration_seconds: float
    retention_percentage: float
    likes: int
    comments: int
    shares: int
    saves: int
    subscribers_gained: int
    click_through_rate: float
    revenue_amount: float
    revenue_currency: str
    impressions: int
    reach: int
    created_at: datetime

    class Config:
        from_attributes = True
