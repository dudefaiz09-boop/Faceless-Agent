import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.trend import Trend
from app.schemas.trend import TrendCreate, TrendResponse
from app.services.trend_research import TrendResearchService

router = APIRouter(prefix="/api/v1/trends", tags=["trends"])


@router.get("/", response_model=list[TrendResponse])
async def list_trends(
    niche_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Trend).where(Trend.user_id == current_user.id)
    if niche_id:
        query = query.where(Trend.niche_id == uuid.UUID(niche_id))
    query = query.order_by(Trend.virality_score.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TrendResponse, status_code=status.HTTP_201_CREATED)
async def create_trend(
    payload: TrendCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trend = Trend(user_id=current_user.id, **payload.model_dump())
    db.add(trend)
    await db.commit()
    await db.refresh(trend)
    return trend


@router.post("/research", response_model=list[TrendResponse])
async def research_trends(
    niche_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TrendResearchService()
    nid = uuid.UUID(niche_id) if niche_id else None
    trends = await service.run(db, user_id=current_user.id, niche_id=nid)
    return trends


@router.get("/{trend_id}", response_model=TrendResponse)
async def get_trend(
    trend_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = uuid.UUID(trend_id)
    result = await db.execute(select(Trend).where(Trend.id == tid, Trend.user_id == current_user.id))
    trend = result.scalar_one_or_none()
    if not trend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trend not found")
    return trend


@router.delete("/{trend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trend(
    trend_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = uuid.UUID(trend_id)
    result = await db.execute(select(Trend).where(Trend.id == tid, Trend.user_id == current_user.id))
    trend = result.scalar_one_or_none()
    if not trend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trend not found")
    await db.delete(trend)
    await db.commit()
