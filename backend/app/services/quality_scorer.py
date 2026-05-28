import json
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.video import Video
from app.models.quality_score import QualityScore
from app.providers.llm import get_llm_provider

QUALITY_SYSTEM_PROMPT = """You are a short-form video quality analyst. Given a video's script, title, and metadata,
score it across 12 quality dimensions from 0.0 to 10.0.

Output valid JSON only with these fields (all float 0.0-10.0):
- hook_strength: how compelling is the hook
- retention_potential: how likely viewers watch to end
- visual_quality: estimated visual appeal
- audio_quality: estimated audio quality
- originality: how unique is the content
- platform_compliance: fits YouTube Shorts / IG Reels norms
- caption_readability: how clear are on-screen captions
- trend_relevance: how relevant to current trends
- shareability: how likely to be shared
- saveability: how likely to be saved/bookmarked
- brand_safety: is it brand-safe
- monetization_suitability: suitable for monetization
- overall_score: weighted overall quality
- details_json: brief reasoning string"""


class QualityScorer:
    def __init__(self):
        self.llm = get_llm_provider()

    async def score(self, db: AsyncSession, video: Video) -> QualityScore:
        prompt = f"""Title: {video.title}
Duration: {video.duration_seconds}s
Resolution: {video.resolution_width}x{video.resolution_height}
Script: {video.script.full_script[:2000] if video.script else "N/A"}
Description: {video.description or "N/A"}

Score this short-form video across all quality dimensions.
Return valid JSON only, no markdown."""

        raw = await self.llm.generate(prompt, system_prompt=QUALITY_SYSTEM_PROMPT)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.removeprefix("```json").removeprefix("```")
        if raw.endswith("```"):
            raw = raw.removesuffix("```")
        raw = raw.strip()
        data = json.loads(raw)

        existing = await db.get(QualityScore, video.id)
        if existing:
            qs = existing
        else:
            qs = QualityScore(video_id=video.id)
            db.add(qs)

        for field in [
            "hook_strength", "retention_potential", "visual_quality",
            "audio_quality", "originality", "platform_compliance",
            "caption_readability", "trend_relevance", "shareability",
            "saveability", "brand_safety", "monetization_suitability",
        ]:
            if field in data:
                setattr(qs, field, round(float(data[field]), 1))

        qs.overall_score = round(float(data.get("overall_score", 0)), 1)
        qs.details_json = data.get("details_json", "")

        await db.commit()
        await db.refresh(qs)
        return qs
