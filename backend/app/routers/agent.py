from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.agent import AgentStatusResponse, AgentLogResponse
from app.services.agent import agent_service

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


@router.get("/status", response_model=AgentStatusResponse)
async def get_agent_status(current_user: User = Depends(get_current_user)):
    return await agent_service.get_status()
