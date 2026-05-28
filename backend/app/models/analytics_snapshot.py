import uuid
from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class AnalyticsSnapshot(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "analytics_snapshots"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    published_post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("published_posts.id", ondelete="CASCADE"), nullable=False)
    snapshot_date = mapped_column(DateTime(timezone=True), nullable=False)

    views: Mapped[int] = mapped_column(Integer, default=0)
    watch_time_seconds: Mapped[int] = mapped_column(Integer, default=0)
    average_view_duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    retention_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    saves: Mapped[int] = mapped_column(Integer, default=0)
    subscribers_gained: Mapped[int] = mapped_column(Integer, default=0)
    click_through_rate: Mapped[float] = mapped_column(Float, default=0.0)
    revenue_amount: Mapped[float] = mapped_column(Float, default=0.0)
    revenue_currency: Mapped[str] = mapped_column(String(10), default="USD")
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    reach: Mapped[int] = mapped_column(Integer, default=0)
    data_json: Mapped[str] = mapped_column(Text, nullable=True)
