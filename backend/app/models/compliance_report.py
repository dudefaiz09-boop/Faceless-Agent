import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ComplianceReport(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "compliance_reports"

    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True)

    is_script_original: Mapped[bool] = mapped_column(Boolean, default=True)
    uses_copyrighted_clips: Mapped[bool] = mapped_column(Boolean, default=False)
    music_licensed: Mapped[bool] = mapped_column(Boolean, default=True)
    reuploads_others_content: Mapped[bool] = mapped_column(Boolean, default=False)
    is_repetitive: Mapped[bool] = mapped_column(Boolean, default=False)
    claims_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    is_misleading: Mapped[bool] = mapped_column(Boolean, default=False)
    is_advertiser_friendly: Mapped[bool] = mapped_column(Boolean, default=True)
    is_safe_for_teens: Mapped[bool] = mapped_column(Boolean, default=True)
    avoids_harmful_content: Mapped[bool] = mapped_column(Boolean, default=True)

    overall_compliance_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_flags: Mapped[str] = mapped_column(Text, nullable=True)
    source_notes: Mapped[str] = mapped_column(Text, nullable=True)
    is_pass: Mapped[bool] = mapped_column(Boolean, default=False)

    video = relationship("Video", back_populates="compliance_report")
