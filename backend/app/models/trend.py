import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Trend(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "trends"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    niche_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("niches.id", ondelete="SET NULL"), nullable=True)
    trend_name: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=True)
    audience_emotion: Mapped[str] = mapped_column(String(255), nullable=True)
    virality_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    competition_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    originality_angle: Mapped[str] = mapped_column(Text, nullable=True)
    suggested_hook: Mapped[str] = mapped_column(Text, nullable=True)
    suggested_title: Mapped[str] = mapped_column(String(500), nullable=True)
    suggested_hashtags: Mapped[str] = mapped_column(Text, nullable=True)
    risk_notes: Mapped[str] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(255), nullable=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user = relationship("User")
    niche = relationship("Niche", back_populates="trends")
    ideas = relationship("Idea", back_populates="trend")
