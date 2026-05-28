import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class PlatformType(str, enum.Enum):
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"


class PlatformCredential(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "platform_credentials"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True)
    platform: Mapped[PlatformType] = mapped_column(SAEnum(PlatformType), nullable=False)
    credential_data: Mapped[str] = mapped_column(Text, nullable=False)
    is_expired: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="platform_credentials")
    account = relationship("Account", back_populates="platform_credentials")
