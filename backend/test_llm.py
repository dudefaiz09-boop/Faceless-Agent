import asyncio
import sys
sys.path.append('.')

from app.providers.llm import get_llm_provider

async def test():
    try:
        llm = get_llm_provider()
        print(f'LLM Provider: {type(llm).__name__}')
        response = await llm.generate('Say hello in one word', system_prompt='You are a helpful assistant')
        print(f'Response: {response.strip()}')
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test())