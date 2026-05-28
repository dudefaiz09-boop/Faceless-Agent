import json
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.published_post import PublishedPost, PostPlatform
from app.models.analytics_snapshot import AnalyticsSnapshot
from app.models.revenue_record import RevenueRecord, RevenueSource
from app.models.platform_credential import PlatformCredential, PlatformType
from app.providers.publishing.youtube import YouTubeAPIPublisher
from app.providers.publishing.instagram import InstagramGraphAPIPublisher


class AnalyticsCollectorService:
    def __init__(self):
        pass

    async def _get_platform_credential(
        self, db: AsyncSession, user_id: str, platform: PlatformType
    ) -> Optional[PlatformCredential]:
        result = await db.execute(
            select(PlatformCredential).where(
                PlatformCredential.user_id == user_id,
                PlatformCredential.platform == platform,
                PlatformCredential.is_expired == False,
            )
        )
        return result.scalar_one_or_none()

    async def _collect_youtube_stats(
        self, db: AsyncSession, post: PublishedPost
    ) -> AnalyticsSnapshot:
        cred = await self._get_platform_credential(db, str(post.user_id), PlatformType.YOUTUBE)
        stats = {"views": 0, "likes": 0, "comments": 0}

        if cred:
            cred_data = json.loads(cred.credential_data)
            publisher = YouTubeAPIPublisher(access_token=cred_data.get("access_token", ""))
            try:
                data = await publisher.get_analytics(post.platform_post_id)
                items = data.get("items", [])
                if items:
                    s = items[0].get("statistics", {})
                    stats = {
                        "views": int(s.get("viewCount", 0)),
                        "likes": int(s.get("likeCount", 0)),
                        "comments": int(s.get("commentCount", 0)),
                    }
            except Exception:
                pass

        snapshot = AnalyticsSnapshot(
            user_id=post.user_id,
            published_post_id=post.id,
            snapshot_date=datetime.now(timezone.utc),
            views=stats.get("views", 0),
            likes=stats.get("likes", 0),
            comments=stats.get("comments", 0),
            shares=0,
            saves=0,
            impressions=0,
            reach=0,
        )
        db.add(snapshot)
        return snapshot

    async def _collect_instagram_stats(
        self, db: AsyncSession, post: PublishedPost
    ) -> AnalyticsSnapshot:
        cred = await self._get_platform_credential(db, str(post.user_id), PlatformType.INSTAGRAM)
        stats = {"views": 0, "likes": 0, "comments": 0, "shares": 0, "saves": 0}

        if cred:
            cred_data = json.loads(cred.credential_data)
            try:
                publisher = InstagramGraphAPIPublisher(
                    access_token=cred_data.get("access_token", ""),
                    business_account_id=settings.INSTAGRAM_BUSINESS_ACCOUNT_ID,
                )
                data = await publisher.get_container_status(post.platform_post_id)
                stats = {
                    "views": int(data.get("like_count", 0)),
                    "likes": int(data.get("like_count", 0)),
                    "comments": int(data.get("comments_count", 0)),
                }
            except Exception:
                pass

        snapshot = AnalyticsSnapshot(
            user_id=post.user_id,
            published_post_id=post.id,
            snapshot_date=datetime.now(timezone.utc),
            views=stats.get("views", 0),
            likes=stats.get("likes", 0),
            comments=stats.get("comments", 0),
            shares=stats.get("shares", 0),
            saves=stats.get("saves", 0),
            impressions=0,
            reach=0,
        )
        db.add(snapshot)
        return snapshot

    async def collect_for_post(
        self, db: AsyncSession, post: PublishedPost
    ) -> AnalyticsSnapshot:
        if post.platform == PostPlatform.YOUTUBE:
            return await self._collect_youtube_stats(db, post)
        elif post.platform == PostPlatform.INSTAGRAM:
            return await self._collect_instagram_stats(db, post)
        else:
            raise ValueError(f"Unsupported platform: {post.platform}")

    async def run(self, db: AsyncSession) -> list[AnalyticsSnapshot]:
        result = await db.execute(
            select(PublishedPost).where(PublishedPost.is_processed == True)
        )
        posts = result.scalars().all()

        snapshots = []
        for post in posts:
            snapshot = await self.collect_for_post(db, post)
            snapshots.append(snapshot)

        await db.commit()
        for s in snapshots:
            await db.refresh(s)
        return snapshots

    async def record_revenue(
        self,
        db: AsyncSession,
        user_id: str,
        source: RevenueSource,
        amount: float,
        currency: str = "USD",
        description: Optional[str] = None,
        published_post_id: Optional[str] = None,
        is_estimated: bool = False,
    ) -> RevenueRecord:
        record = RevenueRecord(
            user_id=user_id,
            published_post_id=published_post_id,
            source=source,
            amount=amount,
            currency=currency,
            recorded_at=datetime.now(timezone.utc),
            description=description,
            is_estimated=is_estimated,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record
