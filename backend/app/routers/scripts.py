from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.script import Script
from app.schemas.script import ScriptCreate, ScriptUpdate, ScriptResponse
from app.services.script_writer import ScriptWriterService

router = APIRouter(prefix="/api/v1/scripts", tags=["scripts"])


@router.get("/", response_model=list[ScriptResponse])
async def list_scripts(
    idea_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Script).where(Script.user_id == current_user.id)
    if idea_id:
        query = query.where(Script.idea_id == idea_id)
    query = query.order_by(Script.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ScriptResponse, status_code=status.HTTP_201_CREATED)
async def create_script(
    payload: ScriptCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    script = Script(user_id=current_user.id, **payload.model_dump())
    db.add(script)
    await db.commit()
    await db.refresh(script)
    return script


@router.post("/generate", response_model=ScriptResponse)
async def generate_script(
    idea_id: str,
    duration_seconds: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ScriptWriterService()
    script = await service.run(db, idea_id=idea_id, duration_seconds=duration_seconds)
    return script


@router.get("/{script_id}", response_model=ScriptResponse)
async def get_script(
    script_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Script).where(Script.id == script_id, Script.user_id == current_user.id))
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    return script


@router.patch("/{script_id}", response_model=ScriptResponse)
async def update_script(
    script_id: str,
    payload: ScriptUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Script).where(Script.id == script_id, Script.user_id == current_user.id))
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(script, field, value)
    await db.commit()
    await db.refresh(script)
    return script


@router.delete("/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_script(
    script_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Script).where(Script.id == script_id, Script.user_id == current_user.id))
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    await db.delete(script)
    await db.commit()
