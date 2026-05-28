import asyncio, json, sys
sys.path.append('.')
from app.providers.llm import get_llm_provider

async def test():
    llm = get_llm_provider()
    resp = await llm.generate('List 2 tech trends as JSON array with just "trend_name" field', system_prompt='Output valid JSON only')
    print('RAW:', repr(resp))
    cleaned = resp.strip().removeprefix("```json").removesuffix("```").strip()
    print('CLEANED:', repr(cleaned))
    try:
        data = json.loads(cleaned)
        print('SUCCESS:', data)
    except json.JSONDecodeError as e:
        print('FAIL:', e)
        print('First 300:', cleaned[:300])

asyncio.run(test())
