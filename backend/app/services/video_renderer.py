import asyncio
import json
import os
from datetime import timedelta
from pathlib import Path
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.video import Video, VideoStatus
from app.models.script import Script
from app.models.idea import Idea
from app.models.asset import Asset, AssetType
from app.providers.tts import EdgeTTSProvider, GTTSTTSProvider
from app.services.asset_manager import AssetManager


class VideoRenderer:
    def __init__(self):
        self.ffmpeg = settings.FFMPEG_PATH
        self.ffprobe = settings.FFPROBE_PATH
        self.width = settings.VIDEO_OUTPUT_WIDTH
        self.height = settings.VIDEO_OUTPUT_HEIGHT
        self.fps = settings.VIDEO_OUTPUT_FPS
        self.bitrate = settings.VIDEO_OUTPUT_BITRATE
        self.font_size = settings.CAPTION_FONT_SIZE
        self.line_height = settings.CAPTION_LINE_HEIGHT
        self.assets = AssetManager()
        self.tts_provider = self._get_tts_provider()

    def _get_tts_provider(self):
        if settings.TTS_PROVIDER == "gtts":
            return GTTSTTSProvider()
        return EdgeTTSProvider()

    async def _run_ffmpeg(self, args: list[str], description: str = "") -> str:
        cmd = [self.ffmpeg, "-y"] + args
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg {description} failed: {stderr.decode()[:500]}")
        return stdout.decode()

    async def _generate_tts(self, text: str, output_path: str) -> float:
        audio_bytes = await self.tts_provider.synthesize(text, voice_style=settings.DEFAULT_TTS_VOICE)
        with open(output_path, "wb") as f:
            f.write(audio_bytes)
        return await self._get_audio_duration(output_path)

    async def _get_audio_duration(self, audio_path: str) -> float:
        cmd = [
            self.ffprobe, "-v", "quiet",
            "-print_format", "json",
            "-show_entries", "format=duration",
            audio_path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        data = json.loads(stdout)
        return float(data["format"]["duration"])

    async def _generate_caption_srt(self, script_text: str, total_duration: float) -> str:
        lines = []
        words = script_text.split()
        words_per_line = 5
        duration_per_word = total_duration / max(len(words), 1)
        current_time = 0.0
        index = 1

        for i in range(0, len(words), words_per_line):
            chunk = words[i : i + words_per_line]
            chunk_duration = len(chunk) * duration_per_word
            start = timedelta(seconds=current_time)
            end = timedelta(seconds=current_time + chunk_duration)
            start_str = f"{start.seconds // 3600:02d}:{(start.seconds % 3600) // 60:02d}:{start.seconds % 60:02d},{start.microseconds // 1000:03d}"
            end_str = f"{end.seconds // 3600:02d}:{(end.seconds % 3600) // 60:02d}:{end.seconds % 60:02d},{end.microseconds // 1000:03d}"
            lines.append(f"{index}")
            lines.append(f"{start_str} --> {end_str}")
            lines.append(" ".join(chunk))
            lines.append("")
            current_time += chunk_duration
            index += 1

        return "\n".join(lines)

    async def _create_background_video(self, duration: float, output_path: str) -> str:
        await self._run_ffmpeg(
            [
                "-f", "lavfi",
                "-i", f"color=c=#1a1a2e:s={self.width}x{self.height}:d={duration}:r={self.fps}",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-pix_fmt", "yuv420p",
                output_path,
            ],
            "background generation",
        )
        return output_path

    async def _overlay_captions(self, video_path: str, srt_path: str, output_path: str) -> str:
        await self._run_ffmpeg(
            [
                "-i", video_path,
                "-vf", (
                    f"subtitles={srt_path}:force_style="
                    f"'FontName=Arial,FontSize={self.font_size},"
                    f"PrimaryCol=&H00FFFFFF,OutlineCol=&H00000000,"
                    f"BorderStyle=1,Outline=2,Shadow=1,"
                    f"Alignment=2,MarginV=100'"
                ),
                "-c:a", "copy",
                "-preset", "fast",
                output_path,
            ],
            "caption overlay",
        )
        return output_path

    async def render(self, db: AsyncSession, video: Video, script: Script, idea: Idea) -> Video:
        video.status = VideoStatus.GENERATING
        await db.commit()

        tts_path = self.assets.get_tts_output_path(str(script.id))
        bg_path = str(self.assets.temp_dir / f"bg_{video.id}.mp4")
        caption_path = self.assets.get_caption_file_path(str(video.id))
        combined_path = str(self.assets.temp_dir / f"combined_{video.id}.mp4")
        final_path = self.assets.get_video_output_path(str(video.id))

        try:
            voice_text = idea.voiceover_text or script.full_script
            audio_duration = await self._generate_tts(voice_text, tts_path)
            video.duration_seconds = int(audio_duration)

            await self._create_background_video(audio_duration, bg_path)

            srt_content = await self._generate_caption_srt(voice_text, audio_duration)
            with open(caption_path, "w", encoding="utf-8") as f:
                f.write(srt_content)

            await self._run_ffmpeg(
                [
                    "-i", bg_path,
                    "-i", tts_path,
                    "-c:v", "libx264",
                    "-c:a", "aac",
                    "-b:v", self.bitrate,
                    "-shortest",
                    "-preset", "fast",
                    "-pix_fmt", "yuv420p",
                    combined_path,
                ],
                "audio-video merge",
            )

            await self._overlay_captions(combined_path, caption_path, final_path)

            video.file_path = final_path
            video.status = VideoStatus.COMPLETED
            video.render_log = "Rendered successfully"
            video.file_size_bytes = os.path.getsize(final_path) if os.path.exists(final_path) else 0

            self.assets.cleanup_temp([tts_path, bg_path, caption_path, combined_path])

        except Exception as e:
            video.status = VideoStatus.FAILED
            video.render_log = str(e)
            raise
        finally:
            await db.commit()
            await db.refresh(video)

        return video
