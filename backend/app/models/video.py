import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class VideoStatus(str, enum.Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    QUEUED_FOR_REVIEW = "queued_for_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class Video(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "videos"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    idea_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ideas.id", ondelete="SET NULL"), nullable=True)
    script_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scripts.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[VideoStatus] = mapped_column(SAEnum(VideoStatus), default=VideoStatus.DRAFT, nullable=False)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=True)
    thumbnail_path: Mapped[str] = mapped_column(String(500), nullable=True)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=True)
    resolution_width: Mapped[int] = mapped_column(Integer, default=1080, nullable=False)
    resolution_height: Mapped[int] = mapped_column(Integer, default=1920, nullable=False)
    fps: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=True)
    video_codec: Mapped[str] = mapped_column(String(50), default="h264")
    audio_codec: Mapped[str] = mapped_column(String(50), default="aac")
    render_log: Mapped[Text] = mapped_column(Text, nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    user = relationship("User", back_populates="videos")
    idea = relationship("Idea")
    script = relationship("Script", back_populates="videos")
    assets = relationship("Asset", back_populates="video", cascade="all, delete-orphan")
    quality_score = relationship("QualityScore", uselist=False, back_populates="video", cascade="all, delete-orphan")
    compliance_report = relationship("ComplianceReport", uselist=False, back_populates="video", cascade="all, delete-orphan")
    publishing_jobs = relationship("PublishingJob", back_populates="video", cascade="all, delete-orphan")
