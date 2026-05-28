import asyncio, json, sys
sys.path.append('.')
from app.providers.llm import get_llm_provider

async def test():
    llm = get_llm_provider()
    prompt = 'Trend: AI Tools\nCategory: Technology\nGenerate 2 video ideas based on this trend. Return valid JSON array only.'
    sys_prompt = """You are a creative video idea strategist for short-form content.
Given a trend or niche, generate detailed video ideas optimized for YouTube Shorts and Instagram Reels.
Each idea must have a strong hook, captions, hashtags, visual direction, and monetization estimate.
Output valid JSON only — an array of objects with these fields:
- video_title: string
- hook_1s: string
- hook_3s: string
- storyboard: string
- voiceover_text: string
- on_screen_text: string
- broll_prompt: string
- caption_text: string
- hashtags: string
- call_to_action: string
- estimated_duration: int (15-60)
- target_audience: string
- platform_adjustments: string
- monetization_potential: float (0-10)
- risk_score: float (0-10)"""
    
    raw = await llm.generate(prompt, system_prompt=sys_prompt)
    print('RAW:', repr(raw))
    
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```")
    if cleaned.endswith("```"):
        cleaned = cleaned.removesuffix("```")
    cleaned = cleaned.strip()
    print('CLEANED:', repr(cleaned))
    
    try:
        data = json.loads(cleaned)
        print('SUCCESS:', len(data), 'ideas')
    except json.JSONDecodeError as e:
        print('FAIL:', e)
        print('First 500:', cleaned[:500])

asyncio.run(test())
