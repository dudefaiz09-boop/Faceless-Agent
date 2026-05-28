from abc import ABC, abstractmethod
from typing import Optional

from app.config import settings


class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        ...


class OllamaProvider(LLMProvider):
    def __init__(self):
        import ollama
        self.client = ollama.AsyncClient(host=settings.OLLAMA_BASE_URL)
        self.model = settings.OLLAMA_MODEL

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat(model=self.model, messages=messages, **kwargs)
        return response["message"]["content"]


class OpenAIProvider(LLMProvider):
    def __init__(self):
        from openai import AsyncOpenAI

        client_kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL

        self.client = AsyncOpenAI(**client_kwargs)
        self.model = settings.OPENAI_MODEL

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            **kwargs
        )
        return response.choices[0].message.content


def get_llm_provider() -> LLMProvider:
    if settings.OPENAI_API_KEY:
        return OpenAIProvider()
    return OllamaProvider()
