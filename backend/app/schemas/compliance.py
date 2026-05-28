from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class ComplianceReportResponse(BaseModel):
    id: uuid.UUID
    video_id: uuid.UUID
    is_script_original: bool
    uses_copyrighted_clips: bool
    music_licensed: bool
    reuploads_others_content: bool
    is_repetitive: bool
    claims_verified: bool
    is_misleading: bool
    is_advertiser_friendly: bool
    is_safe_for_teens: bool
    avoids_harmful_content: bool
    overall_compliance_score: float
    risk_flags: Optional[str]
    source_notes: Optional[str]
    is_pass: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
