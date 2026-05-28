from app.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def research_trends(self):
    """Research trending topics from configured sources."""
    from app.services.trend_research import TrendResearchService
    service = TrendResearchService()
    return service.run()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def generate_ideas(self):
    """Generate video ideas from trends and niches."""
    from app.services.idea_generator import IdeaGeneratorService
    service = IdeaGeneratorService()
    return service.run()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def process_publishing_queue(self):
    """Process pending publishing jobs."""
    from app.services.publisher import PublisherService
    service = PublisherService()
    return service.process_queue()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=600)
def collect_analytics(self):
    """Collect analytics for published posts."""
    from app.services.analytics_collector import AnalyticsCollectorService
    service = AnalyticsCollectorService()
    return service.run()


@celery_app.task(bind=True, max_retries=1)
def cleanup_old_logs(self):
    """Clean up old log entries."""
    from app.database import async_session_factory
    from sqlalchemy import text
    import asyncio

    async def _cleanup():
        async with async_session_factory() as session:
            await session.execute(
                text("DELETE FROM logs WHERE created_at < now() - interval '90 days'")
            )
            await session.commit()

    asyncio.run(_cleanup())
    return {"deleted_logs_older_than_days": 90}
