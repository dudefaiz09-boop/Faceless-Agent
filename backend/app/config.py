from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "ViralReelAgent"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    DEFAULT_TIMEZONE: str = "UTC"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/viralreel"
    REDIS_URL: str = "redis://localhost:6379/0"

    STORAGE_BUCKET: str = "viralreel-storage"
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""
    STORAGE_ENDPOINT: str = ""

    YOUTUBE_CLIENT_ID: str = ""
    YOUTUBE_CLIENT_SECRET: str = ""
    YOUTUBE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/youtube/callback"

    INSTAGRAM_APP_ID: str = ""
    INSTAGRAM_APP_SECRET: str = ""
    INSTAGRAM_ACCESS_TOKEN: str = ""
    INSTAGRAM_BUSINESS_ACCOUNT_ID: str = ""

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    TTS_PROVIDER: str = "edge"  # edge, elevenlabs, gtts
    ELEVENLABS_API_KEY: Optional[str] = None
    IMAGE_PROVIDER_API_KEY: Optional[str] = None
    VIDEO_PROVIDER_API_KEY: Optional[str] = None
    MUSIC_PROVIDER_API_KEY: Optional[str] = None

    PEXELS_API_KEY: Optional[str] = None
    PIXABAY_API_KEY: Optional[str] = None

    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    JWT_REFRESH_EXPIRATION_DAYS: int = 30

    HUMAN_REVIEW_REQUIRED: bool = True
    MAX_POSTS_PER_DAY_YOUTUBE: int = 3
    MAX_POSTS_PER_DAY_INSTAGRAM: int = 3
    MIN_QUALITY_SCORE: int = 80
    MIN_COMPLIANCE_SCORE: int = 95

    CONTENT_MODE: str = "semi-auto"  # manual, assisted, semi-auto, auto-pilot

    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Video rendering
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"
    OUTPUT_DIR: str = "output"
    TEMP_DIR: str = "tmp"
    DEFAULT_TTS_VOICE: str = "en-US-JennyNeural"
    VIDEO_OUTPUT_WIDTH: int = 1080
    VIDEO_OUTPUT_HEIGHT: int = 1920
    VIDEO_OUTPUT_FPS: int = 30
    VIDEO_OUTPUT_BITRATE: str = "8M"
    CAPTION_FONT_SIZE: int = 48
    CAPTION_LINE_HEIGHT: float = 1.5
    STOCK_FOOTAGE_DURATION: int = 5
    USE_STOCK_FOOTAGE: bool = False

    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:3000"


settings = Settings()
