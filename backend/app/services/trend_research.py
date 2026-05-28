import json
import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trend import Trend
from app.models.niche import Niche
from app.providers.llm import get_llm_provider

TREND_RESEARCH_SYSTEM_PROMPT = """You are a social media trend research analyst. 
Given a content niche and its details, identify current trending topics suitable for short-form vertical videos (YouTube Shorts, Instagram Reels).
For each trend, provide structured data including virality score, competition score, hooks, titles, and hashtags.
Output valid JSON only — an array of objects with these fields:
- trend_name: string
- category: string (e.g., "technology", "lifestyle", "education", "entertainment")
- reason: string (why this trend is popular)
- audience_emotion: string (dominant emotion it taps into)
- virality_score: float (0-10)
- competition_score: float (0-10, higher = more creators competing)
- originality_angle: string (how to put a unique spin on it)
- suggested_hook: string (a compelling 1-sentence hook)
- suggested_title: string (video title)
- suggested_hashtags: string (comma-separated hashtags)
- risk_notes: string (any brand safety concerns)"""


class TrendResearchService:
    def __init__(self):
        self.llm = get_llm_provider()

    async def research_for_niche(self, db: AsyncSession, niche: Niche) -> list[Trend]:
        prompt = f"""Niche: {niche.name}
Description: {niche.description or "N/A"}
Content Pillars: {niche.content_pillars or "N/A"}
Target Audience: {niche.audience_persona or "N/A"}

Research 5-8 current trending topics in this niche for short-form video content. 
Return valid JSON array only, no markdown."""

        raw = await self.llm.generate(prompt, system_prompt=TREND_RESEARCH_SYSTEM_PROMPT)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.removeprefix("```json").removeprefix("```")
        if raw.endswith("```"):
            raw = raw.removesuffix("```")
        raw = raw.strip()

        trends_data = json.loads(raw)
        saved = []
        for td in trends_data:
            trend = Trend(
                user_id=niche.user_id,
                niche_id=niche.id,
                trend_name=td["trend_name"],
                category=td.get("category"),
                reason=td.get("reason"),
                audience_emotion=td.get("audience_emotion"),
                virality_score=float(td.get("virality_score", 0)),
                competition_score=float(td.get("competition_score", 0)),
                originality_angle=td.get("originality_angle"),
                suggested_hook=td.get("suggested_hook"),
                suggested_title=td.get("suggested_title"),
                suggested_hashtags=td.get("suggested_hashtags"),
                risk_notes=td.get("risk_notes"),
                source="llm-research",
            )
            db.add(trend)
            saved.append(trend)
        await db.commit()
        for t in saved:
            await db.refresh(t)
        return saved

    async def run(self, db: AsyncSession, user_id: Optional[uuid.UUID] = None, niche_id: Optional[uuid.UUID] = None) -> list[Trend]:
        query = select(Niche).where(Niche.is_active == True)
        if niche_id:
            query = query.where(Niche.id == niche_id)
        if user_id:
            query = query.where(Niche.user_id == user_id)
        result = await db.execute(query)
        niches = result.scalars().all()

        all_trends = []
        for niche in niches:
            trends = await self.research_for_niche(db, niche)
            all_trends.extend(trends)
        return all_trends
