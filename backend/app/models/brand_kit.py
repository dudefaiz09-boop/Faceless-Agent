import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class BrandKit(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "brand_kits"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    channel_name: Mapped[str] = mapped_column(String(255), nullable=False)
    logo_url: Mapped[str] = mapped_column(Text, nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#FF0000", nullable=False)
    secondary_color: Mapped[str] = mapped_column(String(7), default="#000000", nullable=False)
    font_family: Mapped[str] = mapped_column(String(255), default="Inter", nullable=False)
    font_url: Mapped[str] = mapped_column(Text, nullable=True)
    voice_style: Mapped[str] = mapped_column(String(100), default="neutral", nullable=True)
    caption_style: Mapped[str] = mapped_column(String(100), default="bold_creator", nullable=True)
    tone: Mapped[str] = mapped_column(String(100), default="casual", nullable=True)
    cta_style: Mapped[str] = mapped_column(String(100), default="direct", nullable=True)
    watermark_enabled: Mapped[str] = mapped_column(String(10), default="false", nullable=True)
    watermark_url: Mapped[str] = mapped_column(Text, nullable=True)
    intro_clip_path: Mapped[str] = mapped_column(String(500), nullable=True)
    outro_clip_path: Mapped[str] = mapped_column(String(500), nullable=True)
    target_audience: Mapped[str] = mapped_column(Text, nullable=True)
    brand_guidelines: Mapped[str] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="brand_kit")
