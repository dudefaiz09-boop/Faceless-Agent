from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.exceptions import AppException, app_exception_handler
from app.routers import auth, niches, trends, ideas, scripts, videos, publishing, analytics, agent
from app.services.agent import agent_service

from app.models.base import Base as ModelsBase
from sqlalchemy import text, inspect


def _run_migrations_sync(conn):
    inspector = inspect(conn)
    if "niches" in inspector.get_table_names():
        col_names = [c["name"] for c in inspector.get_columns("niches")]
        if "pipeline_status" not in col_names:
            conn.execute(text("ALTER TABLE niches ADD COLUMN pipeline_status VARCHAR(50) DEFAULT 'idle'"))
        if "last_agent_action" not in col_names:
            conn.execute(text("ALTER TABLE niches ADD COLUMN last_agent_action TEXT"))
        if "last_agent_action_at" not in col_names:
            conn.execute(text("ALTER TABLE niches ADD COLUMN last_agent_action_at TEXT"))


async def _run_migrations(conn):
    await conn.run_sync(_run_migrations_sync)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(ModelsBase.metadata.create_all)
        await _run_migrations(conn)
    agent_service.start(app)
    yield
    agent_service.stop()
    await engine.dispose()



app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)

app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(niches.router)
app.include_router(trends.router)
app.include_router(ideas.router)
app.include_router(scripts.router)
app.include_router(videos.router)
app.include_router(publishing.router)
app.include_router(analytics.router)
app.include_router(agent.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
