import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.models.user import User, UserRole
from app.models.niche import Niche
from app.models.trend import Trend
from app.models.idea import Idea, IdeaStatus
from app.models.script import Script
from app.models.video import Video, VideoStatus
from app.models.quality_score import QualityScore
from app.models.compliance_report import ComplianceReport
from app.models.publishing_job import PublishingJob, JobAction, JobStatus
from app.models.published_post import PublishedPost, PostPlatform
from app.models.analytics_snapshot import AnalyticsSnapshot
from app.models.experiment import Experiment, ExperimentType, ExperimentStatus
from app.models.revenue_record import RevenueRecord, RevenueSource
from app.models.log import Log, LogLevel, LogAction
from app.models.setting import Setting
from app.models.brand_kit import BrandKit
from app.models.platform_credential import PlatformCredential, PlatformType
from app.models.account import Account, AccountType

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL, poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    user = User(
        email="test@example.com",
        password_hash="hashed_password",
        display_name="Test User",
        role=UserRole.EDITOR,
    )
    db_session.add(user)
    await db_session.commit()

    assert user.id is not None
    assert isinstance(user.id, uuid.UUID)
    assert user.email == "test@example.com"
    assert user.role == UserRole.EDITOR
    assert user.is_active is True
    assert user.created_at is not None


@pytest.mark.asyncio
async def test_create_niche(db_session: AsyncSession):
    user = User(email="user@test.com", password_hash="hash", display_name="User")
    db_session.add(user)
    await db_session.flush()

    niche = Niche(
        user_id=user.id,
        name="AI Tools",
        description="AI and productivity tools content",
        priority=1,
        content_pillars='["tool reviews", "tips & tricks", "comparisons"]',
    )
    db_session.add(niche)
    await db_session.commit()

    assert niche.id is not None
    assert niche.name == "AI Tools"
    assert niche.is_active is True


@pytest.mark.asyncio
async def test_create_full_content_pipeline(db_session: AsyncSession):
    user = User(email="creator@test.com", password_hash="hash", display_name="Creator")
    db_session.add(user)
    await db_session.flush()

    niche = Niche(user_id=user.id, name="Tech Facts", priority=1)
    db_session.add(niche)
    await db_session.flush()

    trend = Trend(
        user_id=user.id,
        niche_id=niche.id,
        trend_name="AI coding assistants in 2026",
        virality_score=8.5,
        competition_score=6.0,
    )
    db_session.add(trend)
    await db_session.flush()

    idea = Idea(
        user_id=user.id,
        niche_id=niche.id,
        trend_id=trend.id,
        video_title="These AI Tools Blew My Mind",
        estimated_duration=30,
        status=IdeaStatus.DRAFT,
    )
    db_session.add(idea)
    await db_session.flush()

    script = Script(
        user_id=user.id,
        idea_id=idea.id,
        full_script="Did you know AI can now write entire apps? Here are 3 tools...",
        hook_type="curiosity",
        estimated_duration_seconds=30,
    )
    db_session.add(script)
    await db_session.flush()

    video = Video(
        user_id=user.id,
        idea_id=idea.id,
        script_id=script.id,
        title="These AI Tools Blew My Mind",
        status=VideoStatus.DRAFT,
    )
    db_session.add(video)
    await db_session.flush()

    quality = QualityScore(
        video_id=video.id,
        hook_strength=8.0,
        retention_potential=7.5,
        overall_score=8.2,
    )
    db_session.add(quality)
    await db_session.flush()

    compliance = ComplianceReport(
        video_id=video.id,
        is_script_original=True,
        music_licensed=True,
        overall_compliance_score=96.0,
        is_pass=True,
    )
    db_session.add(compliance)
    await db_session.flush()

    job = PublishingJob(
        user_id=user.id,
        video_id=video.id,
        action=JobAction.PUBLISH_YOUTUBE,
        status=JobStatus.PENDING,
        platform="youtube",
    )
    db_session.add(job)
    await db_session.flush()

    post = PublishedPost(
        user_id=user.id,
        video_id=video.id,
        platform=PostPlatform.YOUTUBE,
        platform_post_id="yt_video_123",
        title="These AI Tools Blew My Mind",
    )
    db_session.add(post)
    await db_session.flush()

    analytics = AnalyticsSnapshot(
        user_id=user.id,
        published_post_id=post.id,
        snapshot_date=datetime.now(timezone.utc),
        views=15000,
        likes=1200,
        shares=450,
    )
    db_session.add(analytics)
    await db_session.flush()

    experiment = Experiment(
        user_id=user.id,
        niche_id=niche.id,
        experiment_type=ExperimentType.HOOK,
        name="Curiosity vs Shock hooks",
        status=ExperimentStatus.DRAFT,
    )
    db_session.add(experiment)
    await db_session.flush()

    revenue = RevenueRecord(
        user_id=user.id,
        published_post_id=post.id,
        source=RevenueSource.YOUTUBE_SHORTS,
        amount=45.50,
        recorded_at=datetime.now(timezone.utc),
    )
    db_session.add(revenue)
    await db_session.commit()

    assert video.id is not None
    assert quality.overall_score == 8.2
    assert compliance.is_pass is True
    assert job.status == JobStatus.PENDING
    assert post.platform_post_id == "yt_video_123"
    assert analytics.views == 15000
    assert experiment.experiment_type == ExperimentType.HOOK
    assert revenue.amount == 45.50


@pytest.mark.asyncio
async def test_user_relationships(db_session: AsyncSession):
    user = User(email="rel@test.com", password_hash="hash", display_name="Rel")
    db_session.add(user)
    await db_session.flush()

    account = Account(
        user_id=user.id,
        platform=AccountType.YOUTUBE,
        platform_account_id="UC_test123",
        display_name="My Channel",
        is_primary=True,
    )
    db_session.add(account)

    setting = Setting(user_id=user.id, key="theme", value="dark")
    db_session.add(setting)

    brand = BrandKit(user_id=user.id, channel_name="My Brand")
    db_session.add(brand)

    await db_session.commit()

    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    result = await db_session.execute(
        select(User)
        .where(User.id == user.id)
        .options(selectinload(User.accounts), selectinload(User.settings), selectinload(User.brand_kit))
    )
    loaded_user = result.scalar_one()

    assert len(loaded_user.accounts) == 1
    assert loaded_user.accounts[0].platform == AccountType.YOUTUBE
    assert loaded_user.settings[0].key == "theme"
    assert loaded_user.brand_kit.channel_name == "My Brand"
