import json
import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.idea import Idea, IdeaStatus
from app.models.trend import Trend
from app.models.niche import Niche
from app.providers.llm import get_llm_provider

IDEA_GENERATION_SYSTEM_PROMPT = """You are a creative video idea strategist for short-form content.
Given a trend or niche, generate detailed video ideas optimized for YouTube Shorts and Instagram Reels.
Each idea must have a strong hook, captions, hashtags, visual direction, and monetization estimate.
Output valid JSON only — an array of objects with these fields:
- video_title: string
- hook_1s: string (the first 1-second hook to grab attention)
- hook_3s: string (the 3-second hook that follows)
- storyboard: string (brief visual scene-by-scene description)
- voiceover_text: string (what the narrator says)
- on_screen_text: string (text overlays to display)
- broll_prompt: string (description of B-roll footage needed)
- caption_text: string (social media caption)
- hashtags: string (comma-separated, 5-10 hashtags)
- call_to_action: string
- estimated_duration: int (seconds, 15-60)
- target_audience: string
- platform_adjustments: string
- monetization_potential: float (0-10)
- risk_score: float (0-10, higher = more risk)"""


class IdeaGeneratorService:
    def __init__(self):
        self.llm = get_llm_provider()

    async def generate_from_trend(self, db: AsyncSession, trend: Trend) -> list[Idea]:
        prompt = f"""Trend: {trend.trend_name}
Category: {trend.category or "N/A"}
Originality Angle: {trend.originality_angle or "N/A"}
Suggested Hook: {trend.suggested_hook or "N/A"}
Suggested Hashtags: {trend.suggested_hashtags or "N/A"}
Audience Emotion: {trend.audience_emotion or "N/A"}

Generate 2-3 specific, actionable video ideas based on this trend for short-form vertical video.
Return valid JSON array only, no markdown."""

        raw = await self.llm.generate(prompt, system_prompt=IDEA_GENERATION_SYSTEM_PROMPT)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.removeprefix("```json").removeprefix("```")
        if raw.endswith("```"):
            raw = raw.removesuffix("```")
        raw = raw.strip()

        ideas_data = json.loads(raw)
        saved = []
        for idata in ideas_data:
            idea = Idea(
                user_id=trend.user_id,
                niche_id=trend.niche_id,
                trend_id=trend.id,
                status=IdeaStatus.DRAFT,
                video_title=idata["video_title"],
                hook_1s=idata.get("hook_1s"),
                hook_3s=idata.get("hook_3s"),
                storyboard=idata.get("storyboard"),
                voiceover_text=idata.get("voiceover_text"),
                on_screen_text=idata.get("on_screen_text"),
                broll_prompt=idata.get("broll_prompt"),
                caption_text=idata.get("caption_text"),
                hashtags=idata.get("hashtags"),
                call_to_action=idata.get("call_to_action"),
                estimated_duration=int(idata.get("estimated_duration", 30)),
                target_audience=idata.get("target_audience"),
                platform_adjustments=idata.get("platform_adjustments"),
                monetization_potential=float(idata.get("monetization_potential", 0)),
                risk_score=float(idata.get("risk_score", 0)),
            )
            db.add(idea)
            saved.append(idea)
        await db.commit()
        for i in saved:
            await db.refresh(i)
        return saved

    async def run(self, db: AsyncSession, user_id: Optional[uuid.UUID] = None, trend_id: Optional[uuid.UUID] = None, niche_id: Optional[uuid.UUID] = None) -> list[Idea]:
        if trend_id:
            result = await db.execute(select(Trend).where(Trend.id == trend_id, Trend.is_active == True))
            trends = [result.scalar_one_or_none()] if result.scalar_one_or_none() else []
        else:
            query = select(Trend).where(Trend.is_used == False, Trend.is_active == True)
            if user_id:
                query = query.where(Trend.user_id == user_id)
            if niche_id:
                query = query.where(Trend.niche_id == niche_id)
            result = await db.execute(query)
            trends = result.scalars().all()

        all_ideas = []
        for trend in trends:
            ideas = await self.generate_from_trend(db, trend)
            trend.is_used = True
            all_ideas.extend(ideas)
        await db.commit()
        return all_ideas
