import uuid
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class AssetType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    FONT = "font"
    THUMBNAIL = "thumbnail"


class AssetSource(str, enum.Enum):
    GENERATED = "generated"
    STOCK = "stock"
    UPLOADED = "uploaded"
    LOCAL = "local"


class Asset(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "assets"

    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=True)
    asset_type: Mapped[AssetType] = mapped_column(SAEnum(AssetType), nullable=False)
    source: Mapped[AssetSource] = mapped_column(SAEnum(AssetSource), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    local_path: Mapped[str] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)
    width: Mapped[int] = mapped_column(Integer, nullable=True)
    height: Mapped[int] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=True)
    license_type: Mapped[str] = mapped_column(String(100), nullable=True)
    attribution: Mapped[str] = mapped_column(Text, nullable=True)
    checksum: Mapped[str] = mapped_column(String(64), nullable=True)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=True)

    video = relationship("Video", back_populates="assets")
