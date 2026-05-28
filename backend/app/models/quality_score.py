import uuid
from sqlalchemy import Integer, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class QualityScore(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "quality_scores"

    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True)

    hook_strength: Mapped[float] = mapped_column(Float, default=0.0)
    retention_potential: Mapped[float] = mapped_column(Float, default=0.0)
    visual_quality: Mapped[float] = mapped_column(Float, default=0.0)
    audio_quality: Mapped[float] = mapped_column(Float, default=0.0)
    originality: Mapped[float] = mapped_column(Float, default=0.0)
    platform_compliance: Mapped[float] = mapped_column(Float, default=0.0)
    caption_readability: Mapped[float] = mapped_column(Float, default=0.0)
    trend_relevance: Mapped[float] = mapped_column(Float, default=0.0)
    shareability: Mapped[float] = mapped_column(Float, default=0.0)
    saveability: Mapped[float] = mapped_column(Float, default=0.0)
    brand_safety: Mapped[float] = mapped_column(Float, default=0.0)
    monetization_suitability: Mapped[float] = mapped_column(Float, default=0.0)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    details_json: Mapped[str] = mapped_column(Text, nullable=True)

    video = relationship("Video", back_populates="quality_score")
