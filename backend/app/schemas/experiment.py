from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class ExperimentCreate(BaseModel):
    niche_id: Optional[uuid.UUID] = None
    experiment_type: str
    name: str
    description: Optional[str] = None
    variant_a_data: Optional[str] = None
    variant_b_data: Optional[str] = None
    min_sample_size: int = 100


class ExperimentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    variant_a_data: Optional[str] = None
    variant_b_data: Optional[str] = None
    status: Optional[str] = None


class ExperimentResponse(BaseModel):
    id: uuid.UUID
    niche_id: Optional[uuid.UUID]
    experiment_type: str
    status: str
    name: str
    description: Optional[str]
    variant_a_data: Optional[str]
    variant_b_data: Optional[str]
    winner: Optional[str]
    confidence_score: Optional[float]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    min_sample_size: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
