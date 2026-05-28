import asyncio
import json
from app.providers.llm import get_llm_provider

TREND_RESEARCH_SYSTEM_PROMPT = """You are a social media trend research analyst. 
Given a content niche and its details, identify current trending topics suitable for short-form vertical videos (YouTube Shorts, Instagram Reels).
For each trend, provide structured data including virality score, competition score, hooks, titles, and hashtags.
Output valid JSON only — an array of objects with these fields:
- trend_name: string
- category: string (e.g., "technology", "lifestyle", "education", "entertainment")
- reason: string (why this trend is popular)
- audience_emotion: string
- virality_score: float (0-10)
- competition_score: float (0-10)
- originality_angle: string
- suggested_hook: string
- suggested_title: string
- suggested_hashtags: string
- risk_notes: string"""

async def test():
    llm = get_llm_provider()
    prompt = 'Niche: Tech Reviews\nDescription: Latest gadget reviews\n\nResearch 5-8 current trending topics. Return valid JSON array only, no markdown.'
    raw = await llm.generate(prompt, system_prompt=TREND_RESEARCH_SYSTEM_PROMPT)
    print('RAW OUTPUT:')
    print(repr(raw))
    print()
    # Try to strip markdown
    cleaned = raw.strip().removeprefix('```json').removesuffix('```').strip()
    print('CLEANED:')
    print(repr(cleaned))
    try:
        data = json.loads(cleaned)
        print(f'Success: parsed {len(data)} trends')
    except json.JSONDecodeError as e:
        print(f'JSON error: {e}')
        print(f'First 200 chars: {cleaned[:200]}')

asyncio.run(test())
