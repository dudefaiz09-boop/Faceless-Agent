from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.analytics_snapshot import AnalyticsSnapshot
from app.models.revenue_record import RevenueRecord, RevenueSource
from app.models.published_post import PublishedPost
from app.schemas.analytics import AnalyticsSnapshotResponse
from app.schemas.revenue import RevenueRecordCreate, RevenueRecordResponse
from app.services.analytics_collector import AnalyticsCollectorService

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/snapshots", response_model=list[AnalyticsSnapshotResponse])
async def list_snapshots(
    post_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(AnalyticsSnapshot).where(AnalyticsSnapshot.user_id == current_user.id)
    if post_id:
        query = query.where(AnalyticsSnapshot.published_post_id == post_id)
    query = query.order_by(AnalyticsSnapshot.snapshot_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/snapshots/summary")
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            func.sum(AnalyticsSnapshot.views).label("total_views"),
            func.sum(AnalyticsSnapshot.likes).label("total_likes"),
            func.sum(AnalyticsSnapshot.comments).label("total_comments"),
            func.sum(AnalyticsSnapshot.shares).label("total_shares"),
            func.sum(AnalyticsSnapshot.saves).label("total_saves"),
            func.count(AnalyticsSnapshot.id.distinct()).label("snapshot_count"),
        ).where(AnalyticsSnapshot.user_id == current_user.id)
    )
    row = result.one()
    return {
        "total_views": row.total_views or 0,
        "total_likes": row.total_likes or 0,
        "total_comments": row.total_comments or 0,
        "total_shares": row.total_shares or 0,
        "total_saves": row.total_saves or 0,
        "snapshot_count": row.snapshot_count or 0,
    }


@router.post("/collect")
async def collect_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsCollectorService()
    snapshots = await service.run(db)
    return {
        "collected": len(snapshots),
        "message": f"Collected analytics for {len(snapshots)} posts",
    }


@router.get("/revenue", response_model=list[RevenueRecordResponse])
async def list_revenue(
    source: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(RevenueRecord).where(RevenueRecord.user_id == current_user.id)
    if source:
        query = query.where(RevenueRecord.source == source)
    query = query.order_by(RevenueRecord.recorded_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/revenue/summary")
async def get_revenue_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            RevenueRecord.source,
            func.sum(RevenueRecord.amount).label("total"),
            func.count(RevenueRecord.id).label("count"),
        )
        .where(RevenueRecord.user_id == current_user.id)
        .group_by(RevenueRecord.source)
    )
    rows = result.all()
    total = sum(r.total for r in rows)
    return {
        "total_revenue": round(total, 2),
        "by_source": {r.source: {"total": round(r.total, 2), "count": r.count} for r in rows},
    }


@router.post("/revenue", response_model=RevenueRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_revenue(
    payload: RevenueRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsCollectorService()
    record = await service.record_revenue(
        db=db,
        user_id=str(current_user.id),
        source=payload.source,
        amount=payload.amount,
        currency=payload.currency,
        description=payload.description,
        published_post_id=str(payload.published_post_id) if payload.published_post_id else None,
        is_estimated=payload.is_estimated,
    )
    return record
