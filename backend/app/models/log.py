import uuid
from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDMixin


class LogLevel(str, enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogAction(str, enum.Enum):
    TREND_RESEARCH = "trend_research"
    IDEA_GENERATION = "idea_generation"
    SCRIPT_WRITING = "script_writing"
    VIDEO_RENDERING = "video_rendering"
    QUALITY_SCORE = "quality_score"
    COMPLIANCE_CHECK = "compliance_check"
    PUBLISHING = "publishing"
    ANALYTICS_COLLECTION = "analytics_collection"
    EXPERIMENT_RUN = "experiment_run"
    SYSTEM = "system"
    AUTH = "auth"
    SETTINGS_CHANGE = "settings_change"


class Log(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "logs"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("publishing_jobs.id", ondelete="SET NULL"), nullable=True)
    level: Mapped[LogLevel] = mapped_column(SAEnum(LogLevel), nullable=False)
    action: Mapped[LogAction] = mapped_column(SAEnum(LogAction), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(500), nullable=True)
    duration_ms: Mapped[float] = mapped_column(Float, nullable=True)
