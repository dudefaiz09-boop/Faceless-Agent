import json
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.video import Video
from app.models.compliance_report import ComplianceReport
from app.providers.llm import get_llm_provider

COMPLIANCE_SYSTEM_PROMPT = """You are a content compliance auditor for short-form video platforms.
Given a video's script and metadata, check for compliance issues.

Output valid JSON only with these boolean fields:
- is_script_original: does the script appear original
- uses_copyrighted_clips: does it likely use copyrighted content
- music_licensed: is background music likely licensed
- reuploads_others_content: does it reupload others' work
- is_repetitive: is the content repetitive/low-effort
- claims_verified: are factual claims verifiable
- is_misleading: is the content misleading
- is_advertiser_friendly: suitable for advertisers
- is_safe_for_teens: safe for 13+ audience
- avoids_harmful_content: no harmful/dangerous content

And these fields:
- overall_compliance_score: float (0-100)
- risk_flags: string (comma-separated risk descriptions)
- source_notes: string (notes on sources)
- is_pass: boolean (true if overall_compliance_score >= 70)"""


class ComplianceChecker:
    def __init__(self):
        self.llm = get_llm_provider()

    async def check(self, db: AsyncSession, video: Video) -> ComplianceReport:
        prompt = f"""Title: {video.title}
Duration: {video.duration_seconds}s
Script: {video.script.full_script[:2000] if video.script else "N/A"}
Description: {video.description or "N/A"}

Check this video for content compliance issues.
Return valid JSON only, no markdown."""

        raw = await self.llm.generate(prompt, system_prompt=COMPLIANCE_SYSTEM_PROMPT)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.removeprefix("```json").removeprefix("```")
        if raw.endswith("```"):
            raw = raw.removesuffix("```")
        raw = raw.strip()
        data = json.loads(raw)

        existing = await db.get(ComplianceReport, video.id)
        if existing:
            report = existing
        else:
            report = ComplianceReport(video_id=video.id)
            db.add(report)

        bool_fields = [
            "is_script_original", "uses_copyrighted_clips", "music_licensed",
            "reuploads_others_content", "is_repetitive", "claims_verified",
            "is_misleading", "is_advertiser_friendly", "is_safe_for_teens",
            "avoids_harmful_content",
        ]
        for field in bool_fields:
            if field in data:
                setattr(report, field, bool(data[field]))

        report.overall_compliance_score = round(float(data.get("overall_compliance_score", 0)), 1)
        report.risk_flags = data.get("risk_flags", "")
        report.source_notes = data.get("source_notes", "")
        report.is_pass = bool(data.get("is_pass", report.overall_compliance_score >= 70))

        await db.commit()
        await db.refresh(report)
        return report
