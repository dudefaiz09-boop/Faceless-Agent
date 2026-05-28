import json
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.script import Script
from app.models.idea import Idea
from app.providers.llm import get_llm_provider

SCRIPT_WRITER_SYSTEM_PROMPT = """You are a professional short-form video script writer for YouTube Shorts and Instagram Reels.
Given a video idea, write a complete, engaging, fast-paced script optimized for vertical video.

Structure:
1. HOOK (first 1-3 seconds) — grab attention immediately
2. BODY (remaining time) — deliver value, insight, or entertainment
3. PAYOFF / CTA (last 2-3 seconds) — conclusion and call to action

Rules:
- Keep it concise and conversational
- Use simple language anyone can understand
- Every second must earn retention
- Include visual/scene direction in [brackets]
- Mark text overlays with {curly braces}

Output valid JSON only with these fields:
- hook_type: string (e.g., "curiosity", "shock", "question", "statistic", "story", "challenge")
- hook_text: string (first 1-3 seconds of spoken text)
- body_text: string (main content, 15-50 seconds)
- payoff_text: string (concluding statement)
- call_to_action: string
- full_script: string (complete script with [scene directions] and {overlays})
- estimated_duration_seconds: int
- scene_breakdown: string (comma-separated scene descriptions)"""


class ScriptWriterService:
    def __init__(self):
        self.llm = get_llm_provider()

    async def write_script(self, db: AsyncSession, idea: Idea, duration_seconds: Optional[int] = None) -> Script:
        prompt = f"""Video Title: {idea.video_title}
Hook (1s): {idea.hook_1s or "N/A"}
Hook (3s): {idea.hook_3s or "N/A"}
Voiceover Text: {idea.voiceover_text or "N/A"}
Storyboard: {idea.storyboard or "N/A"}
On-Screen Text: {idea.on_screen_text or "N/A"}
Target Audience: {idea.target_audience or "N/A"}
Platform Adjustments: {idea.platform_adjustments or "N/A"}
Call to Action: {idea.call_to_action or "N/A"}
Estimated Duration: {duration_seconds or idea.estimated_duration} seconds

Write a complete script for this short-form video idea.
The script should be fast-paced, retention-optimized, and ready for voiceover recording.
Return valid JSON only, no markdown."""

        raw = await self.llm.generate(prompt, system_prompt=SCRIPT_WRITER_SYSTEM_PROMPT)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.removeprefix("```json").removeprefix("```")
        if raw.endswith("```"):
            raw = raw.removesuffix("```")
        raw = raw.strip()

        sdata = json.loads(raw)

        existing = await db.execute(
            select(Script).where(Script.idea_id == idea.id).order_by(Script.version.desc())
        )
        last = existing.scalar()
        next_version = (last.version + 1) if last else 1

        script = Script(
            user_id=idea.user_id,
            idea_id=idea.id,
            hook_type=sdata.get("hook_type"),
            hook_text=sdata.get("hook_text"),
            body_text=sdata.get("body_text"),
            payoff_text=sdata.get("payoff_text"),
            call_to_action=sdata.get("call_to_action"),
            full_script=sdata.get("full_script", ""),
            estimated_duration_seconds=int(sdata.get("estimated_duration_seconds", duration_seconds or idea.estimated_duration)),
            scene_breakdown=sdata.get("scene_breakdown"),
            version=next_version,
        )
        db.add(script)

        idea.full_script = script.full_script
        if not idea.call_to_action:
            idea.call_to_action = script.call_to_action

        await db.commit()
        await db.refresh(script)
        return script

    async def run(self, db: AsyncSession, idea_id: str, duration_seconds: Optional[int] = None) -> Script:
        result = await db.execute(select(Idea).where(Idea.id == idea_id))
        idea = result.scalar_one_or_none()
        if not idea:
            raise ValueError(f"Idea {idea_id} not found")
        return await self.write_script(db, idea, duration_seconds)
