from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class RevenueRecordCreate(BaseModel):
    published_post_id: Optional[uuid.UUID] = None
    source: str
    amount: float
    currency: str = "USD"
    recorded_at: datetime
    description: Optional[str] = None
    is_estimated: bool = False


class RevenueRecordResponse(BaseModel):
    id: uuid.UUID
    published_post_id: Optional[uuid.UUID]
    source: str
    amount: float
    currency: str
    recorded_at: datetime
    description: Optional[str]
    is_estimated: bool
    created_at: datetime

    class Config:
        from_attributes = True
