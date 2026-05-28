from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class BrandKitCreate(BaseModel):
    channel_name: str
    logo_url: Optional[str] = None
    primary_color: str = "#FF0000"
    secondary_color: str = "#000000"
    font_family: str = "Inter"
    font_url: Optional[str] = None
    voice_style: str = "neutral"
    caption_style: str = "bold_creator"
    tone: str = "casual"
    cta_style: str = "direct"
    watermark_enabled: bool = False
    watermark_url: Optional[str] = None
    intro_clip_path: Optional[str] = None
    outro_clip_path: Optional[str] = None
    target_audience: Optional[str] = None
    brand_guidelines: Optional[str] = None


class BrandKitUpdate(BaseModel):
    channel_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    font_family: Optional[str] = None
    font_url: Optional[str] = None
    voice_style: Optional[str] = None
    caption_style: Optional[str] = None
    tone: Optional[str] = None
    cta_style: Optional[str] = None
    watermark_enabled: Optional[bool] = None
    watermark_url: Optional[str] = None
    intro_clip_path: Optional[str] = None
    outro_clip_path: Optional[str] = None
    target_audience: Optional[str] = None
    brand_guidelines: Optional[str] = None


class BrandKitResponse(BaseModel):
    id: uuid.UUID
    channel_name: str
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    font_family: str
    font_url: Optional[str]
    voice_style: Optional[str]
    caption_style: Optional[str]
    tone: Optional[str]
    cta_style: Optional[str]
    watermark_enabled: str
    watermark_url: Optional[str]
    intro_clip_path: Optional[str]
    outro_clip_path: Optional[str]
    target_audience: Optional[str]
    brand_guidelines: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
