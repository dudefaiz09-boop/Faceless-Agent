from abc import ABC, abstractmethod
from typing import Optional


class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, voice_style: Optional[str] = None) -> bytes:
        ...

    @abstractmethod
    async def get_available_voices(self) -> list[str]:
        ...


class EdgeTTSProvider(TTSProvider):
    async def synthesize(self, text: str, voice_style: Optional[str] = None) -> bytes:
        import edge_tts
        voice = voice_style or "en-US-JennyNeural"
        communicate = edge_tts.Communicate(text, voice)
        audio = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio += chunk["data"]
        return audio

    async def get_available_voices(self) -> list[str]:
        import edge_tts
        voices = await edge_tts.list_voices()
        return [v["ShortName"] for v in voices]


class GTTSTTSProvider(TTSProvider):
    async def synthesize(self, text: str, voice_style: Optional[str] = None) -> bytes:
        from gtts import gTTS
        import io
        tts = gTTS(text=text, lang="en", slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()

    async def get_available_voices(self) -> list[str]:
        return ["en-default"]
