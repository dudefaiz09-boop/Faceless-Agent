from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.video import Video, VideoStatus
from app.models.script import Script
from app.models.idea import Idea
from app.schemas.video import VideoCreate, VideoUpdate, VideoResponse
from app.services.video_renderer import VideoRenderer
from app.services.quality_scorer import QualityScorer
from app.services.compliance_checker import ComplianceChecker

router = APIRouter(prefix="/api/v1/videos", tags=["videos"])


@router.get("/", response_model=list[VideoResponse])
async def list_videos(
    status_filter: str | None = None,
    idea_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Video).where(Video.user_id == current_user.id)
    if status_filter:
        query = query.where(Video.status == status_filter)
    if idea_id:
        query = query.where(Video.idea_id == idea_id)
    query = query.order_by(Video.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
async def create_video(
    payload: VideoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = Video(user_id=current_user.id, **payload.model_dump())
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


@router.post("/generate", response_model=VideoResponse)
async def generate_video(
    idea_id: str,
    script_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Idea).where(Idea.id == idea_id, Idea.user_id == current_user.id)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")

    result = await db.execute(
        select(Script).where(Script.id == script_id, Script.user_id == current_user.id)
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")

    video = Video(
        user_id=current_user.id,
        idea_id=idea.id,
        script_id=script.id,
        title=idea.video_title,
        description=idea.caption_text,
        status=VideoStatus.DRAFT,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    renderer = VideoRenderer()
    video = await renderer.render(db, video, script, idea)
    return video


@router.post("/{video_id}/render", response_model=VideoResponse)
async def render_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.user_id == current_user.id)
        .options(selectinload(Video.script), selectinload(Video.idea))
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    if not video.script:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Video has no script")
    if not video.idea:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Video has no idea")

    renderer = VideoRenderer()
    video = await renderer.render(db, video, video.script, video.idea)
    return video


@router.post("/{video_id}/score", response_model=dict)
async def score_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.user_id == current_user.id)
        .options(selectinload(Video.script))
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    scorer = QualityScorer()
    qs = await scorer.score(db, video)
    return {
        "overall_score": qs.overall_score,
        "hook_strength": qs.hook_strength,
        "retention_potential": qs.retention_potential,
        "originality": qs.originality,
        "is_pass": qs.overall_score >= settings.MIN_QUALITY_SCORE,
    }


@router.post("/{video_id}/compliance", response_model=dict)
async def check_compliance(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video)
        .where(Video.id == video_id, Video.user_id == current_user.id)
        .options(selectinload(Video.script))
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    checker = ComplianceChecker()
    report = await checker.check(db, video)
    return {
        "overall_compliance_score": report.overall_compliance_score,
        "is_pass": report.is_pass,
        "risk_flags": report.risk_flags,
    }


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return video


@router.patch("/{video_id}", response_model=VideoResponse)
async def update_video(
    video_id: str,
    payload: VideoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(video, field, value)
    await db.commit()
    await db.refresh(video)
    return video


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    await db.delete(video)
    await db.commit()
