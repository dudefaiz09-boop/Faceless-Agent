import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.niche import Niche, NichePipelineStatus
from app.schemas.niche import NicheCreate, NicheUpdate, NicheResponse
from app.services.trend_research import TrendResearchService
from app.services.agent import agent_service

router = APIRouter(prefix="/api/v1/niches", tags=["niches"])


@router.get("/", response_model=list[NicheResponse])
async def list_niches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Niche).where(Niche.user_id == current_user.id).order_by(Niche.priority.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=NicheResponse, status_code=status.HTTP_201_CREATED)
async def create_niche(
    payload: NicheCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    niche = Niche(
        user_id=current_user.id,
        **payload.model_dump(),
        pipeline_status=NichePipelineStatus.IDLE,
    )
    db.add(niche)
    await db.commit()
    await db.refresh(niche)

    niche_copy_id = niche.id
    niche_copy_user_id = niche.user_id
    asyncio.create_task(agent_service._process_niche_by_id(niche_copy_id))

    return niche


@router.get("/{niche_id}", response_model=NicheResponse)
async def get_niche(
    niche_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nid = uuid.UUID(niche_id)
    result = await db.execute(select(Niche).where(Niche.id == nid, Niche.user_id == current_user.id))
    niche = result.scalar_one_or_none()
    if not niche:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Niche not found")
    return niche


@router.patch("/{niche_id}", response_model=NicheResponse)
async def update_niche(
    niche_id: str,
    payload: NicheUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nid = uuid.UUID(niche_id)
    result = await db.execute(select(Niche).where(Niche.id == nid, Niche.user_id == current_user.id))
    niche = result.scalar_one_or_none()
    if not niche:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Niche not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(niche, field, value)
    await db.commit()
    await db.refresh(niche)
    return niche


@router.delete("/{niche_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_niche(
    niche_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nid = uuid.UUID(niche_id)
    result = await db.execute(select(Niche).where(Niche.id == nid, Niche.user_id == current_user.id))
    niche = result.scalar_one_or_none()
    if not niche:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Niche not found")
    await db.delete(niche)
    await db.commit()
