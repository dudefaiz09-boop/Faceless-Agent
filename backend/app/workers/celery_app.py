from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "viralreel",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.DEFAULT_TIMEZONE,
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    task_soft_time_limit=3300,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600 * 24 * 7,
)

celery_app.conf.beat_schedule = {
    "research-trends-every-6h": {
        "task": "app.workers.tasks.research_trends",
        "schedule": crontab(hour="*/6"),
    },
    "generate-ideas-every-4h": {
        "task": "app.workers.tasks.generate_ideas",
        "schedule": crontab(hour="*/4"),
    },
    "process-publishing-queue-every-30m": {
        "task": "app.workers.tasks.process_publishing_queue",
        "schedule": crontab(minute="*/30"),
    },
    "collect-analytics-every-12h": {
        "task": "app.workers.tasks.collect_analytics",
        "schedule": crontab(hour="*/12"),
    },
    "cleanup-old-logs-every-24h": {
        "task": "app.workers.tasks.cleanup_old_logs",
        "schedule": crontab(hour="3", minute="0"),
    },
}
