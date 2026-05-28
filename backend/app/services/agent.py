import asyncio
import time
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func

from app.database import async_session_factory
from app.models.user import User
from app.models.niche import Niche, NichePipelineStatus
from app.models.trend import Trend
from app.models.idea import Idea, IdeaStatus
from app.models.agent_log import AgentLog
from app.services.trend_research import TrendResearchService
from app.services.idea_generator import IdeaGeneratorService


class AutonomousAgentService:
    def __init__(self, interval_seconds: int = 120):
        self.interval = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self.last_run_at: Optional[datetime] = None
        self.niches_processed = 0

    async def _record_log(
        self,
        action: str,
        status: str,
        message: Optional[str] = None,
        user_id=None,
        niche_id=None,
        items_created: int = 0,
        duration_ms: Optional[float] = None,
    ):
        async with async_session_factory() as db:
            log = AgentLog(
                user_id=user_id,
                niche_id=niche_id,
                action=action,
                status=status,
                message=message,
                items_created=items_created,
                duration_ms=duration_ms,
                created_at=datetime.now(timezone.utc),
            )
            db.add(log)
            await db.commit()

    async def _update_niche_status(self, niche_id, status: NichePipelineStatus, message: Optional[str] = None):
        async with async_session_factory() as db:
            result = await db.execute(select(Niche).where(Niche.id == niche_id))
            niche = result.scalar_one_or_none()
            if niche:
                niche.pipeline_status = status
                if message:
                    niche.last_agent_action = message
                niche.last_agent_action_at = datetime.now(timezone.utc).isoformat()
                await db.commit()

    async def _process_niche(self, db, niche: Niche) -> bool:
        processed = False

        # Step 1: Research trends for this niche (if no trends yet)
        result = await db.execute(
            select(Trend).where(Trend.niche_id == niche.id, Trend.is_active == True)
        )
        existing_trends = result.scalars().all()

        if not existing_trends and niche.is_active:
            start = time.monotonic()
            try:
                await self._update_niche_status(niche.id, NichePipelineStatus.RESEARCHING)
                service = TrendResearchService()
                trends = await service.run(db, user_id=niche.user_id, niche_id=niche.id)
                elapsed = (time.monotonic() - start) * 1000
                await self._record_log(
                    action="research_trends",
                    status="completed",
                    message=f"Researched {len(trends)} trends for niche '{niche.name}'",
                    user_id=niche.user_id,
                    niche_id=niche.id,
                    items_created=len(trends),
                    duration_ms=elapsed,
                )
                await self._update_niche_status(
                    niche.id, NichePipelineStatus.IDEAS_GENERATED if len(trends) > 0 else NichePipelineStatus.IDLE,
                    f"Found {len(trends)} trends"
                )
                self.niches_processed += 1
                processed = True
            except Exception as e:
                elapsed = (time.monotonic() - start) * 1000
                await self._record_log(
                    action="research_trends",
                    status="error",
                    message=f"Error researching trends for '{niche.name}': {str(e)}",
                    user_id=niche.user_id,
                    niche_id=niche.id,
                    duration_ms=elapsed,
                )
                await self._update_niche_status(niche.id, NichePipelineStatus.ERROR, f"Research failed: {str(e)}")

        # Step 2: Generate ideas from unused trends
        result = await db.execute(
            select(Trend).where(
                Trend.niche_id == niche.id,
                Trend.is_active == True,
                Trend.is_used == False,
            )
        )
        unused_trends = result.scalars().all()

        if unused_trends:
            start = time.monotonic()
            try:
                await self._update_niche_status(niche.id, NichePipelineStatus.RESEARCHING)
                service = IdeaGeneratorService()
                ideas = await service.run(db, user_id=niche.user_id, niche_id=niche.id)
                elapsed = (time.monotonic() - start) * 1000
                await self._record_log(
                    action="generate_ideas",
                    status="completed",
                    message=f"Generated {len(ideas)} ideas from {len(unused_trends)} trends for niche '{niche.name}'",
                    user_id=niche.user_id,
                    niche_id=niche.id,
                    items_created=len(ideas),
                    duration_ms=elapsed,
                )
                await self._update_niche_status(
                    niche.id, NichePipelineStatus.IDEAS_GENERATED,
                    f"Generated {len(ideas)} ideas"
                )
                self.niches_processed += 1
                processed = True
            except Exception as e:
                elapsed = (time.monotonic() - start) * 1000
                await self._record_log(
                    action="generate_ideas",
                    status="error",
                    message=f"Error generating ideas for '{niche.name}': {str(e)}",
                    user_id=niche.user_id,
                    niche_id=niche.id,
                    duration_ms=elapsed,
                )

        return processed

    async def _process_niche_by_id(self, niche_id):
        try:
            async with async_session_factory() as db:
                result = await db.execute(select(Niche).where(Niche.id == niche_id))
                niche = result.scalar_one_or_none()
                if niche:
                    await self._process_niche(db, niche)
        except Exception as e:
            await self._record_log(
                action="process_niche_by_id",
                status="error",
                message=f"Error processing niche {niche_id}: {str(e)}",
            )

    async def _run_cycle(self):
        try:
            async with async_session_factory() as db:
                result = await db.execute(
                    select(Niche).where(Niche.is_active == True).order_by(Niche.priority.desc())
                )
                niches = result.scalars().all()

                for niche in niches:
                    await self._process_niche(db, niche)

            self.last_run_at = datetime.now(timezone.utc)
        except Exception as e:
            await self._record_log(
                action="agent_cycle",
                status="error",
                message=f"Agent cycle error: {str(e)}",
            )

    async def _loop(self):
        self._running = True
        while self._running:
            await self._run_cycle()
            await asyncio.sleep(self.interval)

    def start(self, app):
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop())
            return self._task

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

    async def get_status(self) -> dict:
        async with async_session_factory() as db:
            count = await db.execute(select(func.count()).select_from(AgentLog))
            total_logs = count.scalar() or 0

            logs_result = await db.execute(
                select(AgentLog).order_by(AgentLog.created_at.desc()).limit(20)
            )
            recent_logs = logs_result.scalars().all()

        return {
            "is_running": self._running,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "niches_processed": self.niches_processed,
            "total_actions": total_logs,
            "recent_logs": recent_logs,
        }


agent_service = AutonomousAgentService()
