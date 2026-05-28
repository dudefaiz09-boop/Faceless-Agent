import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.idea import Idea
from app.schemas.idea import IdeaCreate, IdeaUpdate, IdeaStatusUpdate, IdeaResponse
from app.services.idea_generator import IdeaGeneratorService

router = APIRouter(prefix="/api/v1/ideas", tags=["ideas"])


@router.get("/", response_model=list[IdeaResponse])
async def list_ideas(
    status_filter: str | None = Query(None, alias="status"),
    niche_id: str | None = None,
    trend_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Idea).where(Idea.user_id == current_user.id)
    if status_filter:
        query = query.where(Idea.status == status_filter)
    if niche_id:
        query = query.where(Idea.niche_id == uuid.UUID(niche_id))
    if trend_id:
        query = query.where(Idea.trend_id == uuid.UUID(trend_id))
    query = query.order_by(Idea.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_idea(
    payload: IdeaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = Idea(user_id=current_user.id, **payload.model_dump())
    db.add(idea)
    await db.commit()
    await db.refresh(idea)
    return idea


@router.post("/generate", response_model=list[IdeaResponse])
async def generate_ideas(
    trend_id: str | None = None,
    niche_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IdeaGeneratorService()
    tid = uuid.UUID(trend_id) if trend_id else None
    nid = uuid.UUID(niche_id) if niche_id else None
    ideas = await service.run(db, user_id=current_user.id, trend_id=tid, niche_id=nid)
    return ideas


@router.get("/{idea_id}", response_model=IdeaResponse)
async def get_idea(
    idea_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    iid = uuid.UUID(idea_id)
    result = await db.execute(select(Idea).where(Idea.id == iid, Idea.user_id == current_user.id))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    return idea


@router.patch("/{idea_id}", response_model=IdeaResponse)
async def update_idea(
    idea_id: str,
    payload: IdeaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    iid = uuid.UUID(idea_id)
    result = await db.execute(select(Idea).where(Idea.id == iid, Idea.user_id == current_user.id))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(idea, field, value)
    await db.commit()
    await db.refresh(idea)
    return idea


@router.patch("/{idea_id}/status", response_model=IdeaResponse)
async def update_idea_status(
    idea_id: str,
    payload: IdeaStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    iid = uuid.UUID(idea_id)
    result = await db.execute(select(Idea).where(Idea.id == iid, Idea.user_id == current_user.id))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    idea.status = payload.status
    await db.commit()
    await db.refresh(idea)
    return idea


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    idea_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    iid = uuid.UUID(idea_id)
    result = await db.execute(select(Idea).where(Idea.id == iid, Idea.user_id == current_user.id))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    await db.delete(idea)
    await db.commit()
