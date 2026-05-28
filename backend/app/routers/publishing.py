from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.config import settings
from app.models.user import User
from app.models.publishing_job import PublishingJob, JobStatus, JobAction
from app.models.published_post import PublishedPost
from app.schemas.publishing import PublishingJobCreate, PublishingJobResponse, PublishedPostResponse
from app.services.publisher import PublisherService

router = APIRouter(prefix="/api/v1/publishing", tags=["publishing"])


@router.get("/jobs", response_model=list[PublishingJobResponse])
async def list_jobs(
    status_filter: str | None = None,
    action_filter: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(PublishingJob).where(PublishingJob.user_id == current_user.id)
    if status_filter:
        query = query.where(PublishingJob.status == status_filter)
    if action_filter:
        query = query.where(PublishingJob.action == action_filter)
    query = query.order_by(PublishingJob.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/jobs", response_model=PublishingJobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: PublishingJobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PublisherService()
    job = await service.create_job(
        db=db,
        user_id=str(current_user.id),
        video_id=str(payload.video_id),
        action=payload.action,
        platform=payload.platform,
        scheduled_at=payload.scheduled_at,
        priority=payload.priority,
    )
    return job


@router.post("/process", response_model=list[PublishingJobResponse])
async def process_queue(
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PublisherService()
    jobs = await service.process_queue(db, limit=limit)
    return jobs


@router.get("/jobs/{job_id}", response_model=PublishingJobResponse)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PublishingJob).where(PublishingJob.id == job_id, PublishingJob.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.post("/jobs/{job_id}/cancel", response_model=PublishingJobResponse)
async def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PublishingJob).where(PublishingJob.id == job_id, PublishingJob.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a completed or failed job")
    job.status = JobStatus.CANCELLED
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/posts", response_model=list[PublishedPostResponse])
async def list_posts(
    platform_filter: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(PublishedPost).where(PublishedPost.user_id == current_user.id)
    if platform_filter:
        query = query.where(PublishedPost.platform == platform_filter)
    query = query.order_by(PublishedPost.published_at.desc().nullslast())
    result = await db.execute(query)
    return result.scalars().all()
