import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class IdeaStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PRODUCTION = "in_production"
    COMPLETED = "completed"


class Idea(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ideas"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    niche_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("niches.id", ondelete="SET NULL"), nullable=True)
    trend_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trends.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[IdeaStatus] = mapped_column(SAEnum(IdeaStatus), default=IdeaStatus.DRAFT, nullable=False)

    video_title: Mapped[str] = mapped_column(String(500), nullable=False)
    hook_1s: Mapped[str] = mapped_column(String(500), nullable=True)
    hook_3s: Mapped[str] = mapped_column(String(500), nullable=True)
    full_script: Mapped[Text] = mapped_column(Text, nullable=True)
    storyboard: Mapped[Text] = mapped_column(Text, nullable=True)
    voiceover_text: Mapped[Text] = mapped_column(Text, nullable=True)
    on_screen_text: Mapped[str] = mapped_column(Text, nullable=True)
    broll_prompt: Mapped[str] = mapped_column(Text, nullable=True)
    motion_graphics_prompt: Mapped[str] = mapped_column(Text, nullable=True)
    caption_text: Mapped[Text] = mapped_column(Text, nullable=True)
    hashtags: Mapped[str] = mapped_column(Text, nullable=True)
    call_to_action: Mapped[str] = mapped_column(String(500), nullable=True)
    estimated_duration: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    target_audience: Mapped[str] = mapped_column(String(500), nullable=True)
    platform_adjustments: Mapped[Text] = mapped_column(Text, nullable=True)
    monetization_potential: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    user = relationship("User", back_populates="ideas")
    niche = relationship("Niche", back_populates="ideas")
    trend = relationship("Trend", back_populates="ideas")
    scripts = relationship("Script", back_populates="idea", cascade="all, delete-orphan")
