import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class ExperimentType(str, enum.Enum):
    HOOK = "hook"
    TITLE = "title"
    CAPTION = "caption"
    HASHTAG = "hashtag"
    THUMBNAIL = "thumbnail"
    VIDEO_LENGTH = "video_length"
    VOICE_STYLE = "voice_style"
    CAPTION_STYLE = "caption_style"
    MUSIC_MOOD = "music_mood"
    POSTING_TIME = "posting_time"


class ExperimentStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Experiment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "experiments"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    niche_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("niches.id", ondelete="SET NULL"), nullable=True)
    experiment_type: Mapped[ExperimentType] = mapped_column(SAEnum(ExperimentType), nullable=False)
    status: Mapped[ExperimentStatus] = mapped_column(SAEnum(ExperimentStatus), default=ExperimentStatus.DRAFT, nullable=False)

    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    variant_a_data: Mapped[str] = mapped_column(Text, nullable=True)
    variant_b_data: Mapped[str] = mapped_column(Text, nullable=True)
    winner: Mapped[str] = mapped_column(String(10), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)
    started_at = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at = mapped_column(DateTime(timezone=True), nullable=True)
    min_sample_size: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    results_json: Mapped[str] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="experiments")
    niche = relationship("Niche", back_populates="experiments")
