import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class PostPlatform(str, enum.Enum):
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"


class PublishedPost(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "published_posts"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    platform: Mapped[PostPlatform] = mapped_column(SAEnum(PostPlatform), nullable=False)
    platform_post_id: Mapped[str] = mapped_column(String(255), nullable=False)
    platform_url: Mapped[str] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    hashtags: Mapped[str] = mapped_column(Text, nullable=True)
    privacy_status: Mapped[str] = mapped_column(String(50), nullable=True)
    published_at = mapped_column(DateTime(timezone=True), nullable=True)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    platform_data: Mapped[str] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="published_posts")
    video = relationship("Video")
