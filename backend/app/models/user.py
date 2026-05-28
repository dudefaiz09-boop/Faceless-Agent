import uuid
from sqlalchemy import String, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"
    OWNER = "owner"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    platform_credentials = relationship("PlatformCredential", back_populates="user", cascade="all, delete-orphan")
    niches = relationship("Niche", back_populates="user", cascade="all, delete-orphan")
    ideas = relationship("Idea", back_populates="user")
    scripts = relationship("Script", back_populates="user")
    videos = relationship("Video", back_populates="user")
    publishing_jobs = relationship("PublishingJob", back_populates="user")
    published_posts = relationship("PublishedPost", back_populates="user")
    experiments = relationship("Experiment", back_populates="user")
    revenue_records = relationship("RevenueRecord", back_populates="user")
    brand_kit = relationship("BrandKit", uselist=False, back_populates="user", cascade="all, delete-orphan")
    settings = relationship("Setting", back_populates="user", cascade="all, delete-orphan")
