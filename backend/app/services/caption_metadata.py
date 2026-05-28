import json
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.script import Script
from app.providers.llm import get_llm_provider

CAPTION_SYSTEM_PROMPT = """You are a social media caption and metadata specialist for short-form video content.
Given a video's script and idea details, generate:
1. An engaging caption (optimized for YouTube Shorts / Instagram Reels)
2. A set of relevant hashtags (mix of broad and niche-specific)
3. An SEO-optimized video title
4. An SEO-optimized video description

Output valid JSON only with these fields:
- caption_text: string (the social media caption, 100-300 chars)
- hashtags: string (comma-separated, 8-15 hashtags)
- seo_title: string (SEO-optimized title, max 100 chars)
- seo_description: string (SEO-optimized description, 2-3 sentences)
- seo_tags: string (comma-separated keywords for video metadata)"""


class CaptionMetadataService:
    def __init__(self):
        self.llm = get_llm_provider()

    async def generate_for_script(self, script: Script) -> dict:
        prompt = f"""Video Title: {script.idea.video_title if script.idea else "N/A"}
Hook Type: {script.hook_type or "N/A"}
Hook Text: {script.hook_text or "N/A"}
Full Script: {script.full_script[:2000]}
Call to Action: {script.call_to_action or "N/A"}
Target Audience: {script.idea.target_audience if script.idea else "N/A"}
Estimated Duration: {script.estimated_duration_seconds} seconds

Generate optimized captions, hashtags, and SEO metadata for this short-form video.
Return valid JSON only, no markdown."""

        raw = await self.llm.generate(prompt, system_prompt=CAPTION_SYSTEM_PROMPT)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.removeprefix("```json").removeprefix("```")
        if raw.endswith("```"):
            raw = raw.removesuffix("```")
        raw = raw.strip()
        return json.loads(raw)

    async def generate_and_save(self, db: AsyncSession, script: Script) -> dict:
        data = await self.generate_for_script(script)

        if script.idea:
            if not script.idea.caption_text:
                script.idea.caption_text = data.get("caption_text")
            if not script.idea.hashtags:
                script.idea.hashtags = data.get("hashtags")

        await db.commit()
        return data
