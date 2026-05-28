import json
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.publishing_job import PublishingJob, JobStatus, JobAction
from app.models.published_post import PublishedPost, PostPlatform
from app.models.video import Video
from app.models.platform_credential import PlatformCredential, PlatformType
from app.providers.publishing.youtube import YouTubeAPIPublisher
from app.providers.publishing.instagram import InstagramGraphAPIPublisher


class PublisherService:
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

    async def _publish_to_youtube(
        self, db: AsyncSession, job: PublishingJob, video: Video
    ) -> PublishedPost:
        cred = await self._get_platform_credential(db, str(job.user_id), PlatformType.YOUTUBE)
        if not cred:
            raise RuntimeError("No valid YouTube credential found")

        cred_data = json.loads(cred.credential_data)
        publisher = YouTubeAPIPublisher(access_token=cred_data.get("access_token", ""))

        tags = []
        if video.idea and video.idea.hashtags:
            tags = [h.strip().lstrip("#") for h in video.idea.hashtags.split(",") if h.strip()]

        result = await publisher.upload_video(
            video_path=video.file_path or "",
            title=video.title,
            description=video.description or "",
            tags=tags,
            privacy_status="public",
            thumbnail_path=video.thumbnail_path,
        )

        post = PublishedPost(
            user_id=job.user_id,
            video_id=video.id,
            platform=PostPlatform.YOUTUBE,
            platform_post_id=result.get("id", ""),
            title=video.title,
            description=video.description,
            hashtags=video.idea.hashtags if video.idea else None,
            privacy_status="public",
            published_at=datetime.now(timezone.utc),
            platform_data=json.dumps(result),
        )
        db.add(post)
        return post

    async def _publish_to_instagram(
        self, db: AsyncSession, job: PublishingJob, video: Video
    ) -> PublishedPost:
        cred = await self._get_platform_credential(db, str(job.user_id), PlatformType.INSTAGRAM)
        if not cred:
            raise RuntimeError("No valid Instagram credential found")

        cred_data = json.loads(cred.credential_data)
        publisher = InstagramGraphAPIPublisher(
            access_token=cred_data.get("access_token", ""),
            business_account_id=settings.INSTAGRAM_BUSINESS_ACCOUNT_ID,
        )

        caption_parts = [video.title]
        if video.description:
            caption_parts.append(video.description)
        if video.idea and video.idea.hashtags:
            caption_parts.append(video.idea.hashtags)
        caption = "\n\n".join(caption_parts)

        container_id = await publisher.create_reel_container(
            video_url=video.file_path or "",
            caption=caption,
        )
        published_id = await publisher.publish_container(container_id)

        post = PublishedPost(
            user_id=job.user_id,
            video_id=video.id,
            platform=PostPlatform.INSTAGRAM,
            platform_post_id=published_id,
            title=video.title,
            description=caption,
            hashtags=video.idea.hashtags if video.idea else None,
            published_at=datetime.now(timezone.utc),
        )
        db.add(post)
        return post

    async def process_job(self, db: AsyncSession, job: PublishingJob) -> PublishingJob:
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        await db.commit()

        try:
            result = await db.execute(
                select(Video)
                .where(Video.id == job.video_id)
                .options(selectinload(Video.idea), selectinload(Video.script))
            )
            video = result.scalar_one_or_none()
            if not video:
                raise RuntimeError(f"Video {job.video_id} not found")

            if job.action == JobAction.PUBLISH_YOUTUBE:
                await self._publish_to_youtube(db, job, video)
            elif job.action == JobAction.PUBLISH_INSTAGRAM:
                await self._publish_to_instagram(db, job, video)
            else:
                raise RuntimeError(f"Unsupported action: {job.action}")

            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            job.result_data = json.dumps({"success": True})

        except Exception as e:
            job.retry_count += 1
            if job.retry_count >= job.max_retries:
                job.status = JobStatus.FAILED
            else:
                job.status = JobStatus.RETRYING
            job.error_message = str(e)

        await db.commit()
        await db.refresh(job)
        return job

    async def process_queue(self, db: AsyncSession, limit: int = 5) -> list[PublishingJob]:
        result = await db.execute(
            select(PublishingJob)
            .where(PublishingJob.status.in_([JobStatus.PENDING, JobStatus.RETRYING]))
            .order_by(PublishingJob.priority.desc(), PublishingJob.created_at.asc())
            .limit(limit)
        )
        jobs = result.scalars().all()

        processed = []
        for job in jobs:
            processed.append(await self.process_job(db, job))
        return processed

    async def create_job(
        self,
        db: AsyncSession,
        user_id: str,
        video_id: str,
        action: JobAction,
        platform: Optional[str] = None,
        scheduled_at: Optional[datetime] = None,
        priority: int = 0,
    ) -> PublishingJob:
        job = PublishingJob(
            user_id=user_id,
            video_id=video_id,
            action=action,
            platform=platform,
            scheduled_at=scheduled_at,
            priority=priority,
            status=JobStatus.PENDING,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job
