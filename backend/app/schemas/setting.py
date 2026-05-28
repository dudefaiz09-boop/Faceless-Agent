from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class SettingCreate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    is_encrypted: bool = False


class SettingUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None
    is_encrypted: Optional[bool] = None


class SettingResponse(BaseModel):
    id: uuid.UUID
    key: str
    value: str
    description: Optional[str]
    is_encrypted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
