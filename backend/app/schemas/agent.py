from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class AgentLogResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    niche_id: Optional[uuid.UUID] = None
    action: str
    status: str
    message: Optional[str] = None
    items_created: int = 0
    duration_ms: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentStatusResponse(BaseModel):
    is_running: bool
    last_run_at: Optional[str] = None
    niches_processed: int = 0
    total_actions: int = 0
    recent_logs: list[AgentLogResponse] = []
