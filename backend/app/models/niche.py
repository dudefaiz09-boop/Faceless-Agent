import uuid
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class NichePipelineStatus(str, enum.Enum):
    IDLE = "idle"
    RESEARCHING = "researching"
    IDEAS_GENERATED = "ideas_generated"
    SCRIPTS_WRITTEN = "scripts_written"
    VIDEOS_RENDERED = "videos_rendered"
    PUBLISHING = "publishing"
    COMPLETED = "completed"
    ERROR = "error"


class Niche(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "niches"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pipeline_status: Mapped[NichePipelineStatus] = mapped_column(SAEnum(NichePipelineStatus), default=NichePipelineStatus.IDLE, nullable=False)
    last_agent_action: Mapped[str] = mapped_column(Text, nullable=True)
    last_agent_action_at: Mapped[str] = mapped_column(Text, nullable=True)

    content_pillars: Mapped[str] = mapped_column(Text, nullable=True)
    audience_persona: Mapped[str] = mapped_column(Text, nullable=True)
    hook_formulas: Mapped[str] = mapped_column(Text, nullable=True)
    visual_style_guide: Mapped[str] = mapped_column(Text, nullable=True)
    caption_style: Mapped[str] = mapped_column(Text, nullable=True)
    hashtag_style: Mapped[str] = mapped_column(Text, nullable=True)
    monetization_angle: Mapped[str] = mapped_column(Text, nullable=True)
    content_safety_rules: Mapped[str] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="niches")
    trends = relationship("Trend", back_populates="niche", cascade="all, delete-orphan")
    ideas = relationship("Idea", back_populates="niche")
    experiments = relationship("Experiment", back_populates="niche")
