import uuid
from sqlalchemy import String, Text, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Script(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "scripts"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    idea_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False)
    hook_type: Mapped[str] = mapped_column(String(100), nullable=True)
    hook_text: Mapped[str] = mapped_column(String(500), nullable=True)
    body_text: Mapped[Text] = mapped_column(Text, nullable=True)
    payoff_text: Mapped[str] = mapped_column(String(500), nullable=True)
    call_to_action: Mapped[str] = mapped_column(String(500), nullable=True)
    full_script: Mapped[Text] = mapped_column(Text, nullable=False)
    estimated_duration_seconds: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    scene_breakdown: Mapped[Text] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    user = relationship("User", back_populates="scripts")
    idea = relationship("Idea", back_populates="scripts")
    videos = relationship("Video", back_populates="script")
