import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class RevenueSource(str, enum.Enum):
    YOUTUBE_ADS = "youtube_ads"
    YOUTUBE_SHORTS = "youtube_shorts"
    AFFILIATE = "affiliate"
    SPONSORSHIP = "sponsorship"
    DIGITAL_PRODUCT = "digital_product"
    NEWSLETTER = "newsletter"
    OTHER = "other"


class RevenueRecord(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "revenue_records"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    published_post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("published_posts.id", ondelete="SET NULL"), nullable=True)
    source: Mapped[RevenueSource] = mapped_column(SAEnum(RevenueSource), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    recorded_at = mapped_column(DateTime(timezone=True), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_estimated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    platform_data: Mapped[str] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="revenue_records")
