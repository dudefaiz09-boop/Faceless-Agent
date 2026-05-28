import uuid
from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class JobAction(str, enum.Enum):
    PUBLISH_YOUTUBE = "publish_youtube"
    PUBLISH_INSTAGRAM = "publish_instagram"
    GENERATE_VIDEO = "generate_video"
    RESEARCH_TRENDS = "research_trends"
    GENERATE_IDEAS = "generate_ideas"
    SCORE_QUALITY = "score_quality"
    CHECK_COMPLIANCE = "check_compliance"


class PublishingJob(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "publishing_jobs"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=True)
    action: Mapped[JobAction] = mapped_column(SAEnum(JobAction), nullable=False)
    status: Mapped[JobStatus] = mapped_column(SAEnum(JobStatus), default=JobStatus.PENDING, nullable=False)

    platform: Mapped[str] = mapped_column(String(50), nullable=True)
    scheduled_at = mapped_column(DateTime(timezone=True), nullable=True)
    started_at = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at = mapped_column(DateTime(timezone=True), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    result_data: Mapped[str] = mapped_column(Text, nullable=True)
    queue_name: Mapped[str] = mapped_column(String(100), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="publishing_jobs")
    video = relationship("Video", back_populates="publishing_jobs")
