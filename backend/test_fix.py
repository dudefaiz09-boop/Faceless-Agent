import asyncio, json, sys
sys.path.append('.')
from app.providers.llm import get_llm_provider

async def test():
    llm = get_llm_provider()
    resp = await llm.generate('List 2 tech trends as JSON array with just "trend_name" field', system_prompt='Output valid JSON only')
    print('RAW:', repr(resp))
    raw = resp.strip()
    if raw.startswith("```"):
        raw = raw.removeprefix("```json").removeprefix("```")
    if raw.endswith("```"):
        raw = raw.removesuffix("```")
    raw = raw.strip()
    print('CLEANED:', repr(raw))
    data = json.loads(raw)
    print('SUCCESS:', data)

asyncio.run(test())
