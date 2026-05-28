import os
import shutil
import aiofiles
import aiohttp
from pathlib import Path
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.asset import Asset, AssetType, AssetSource


class AssetManager:
    def __init__(self):
        self.temp_dir = Path(settings.TEMP_DIR)
        self.output_dir = Path(settings.OUTPUT_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def download_stock_video(self, url: str, destination: str) -> str:
        dest_path = self.temp_dir / destination
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                resp.raise_for_status()
                async with aiofiles.open(dest_path, "wb") as f:
                    await f.write(await resp.read())
        return str(dest_path)

    async def save_upload(self, content: bytes, filename: str, subdir: str = "uploads") -> str:
        dest = self.temp_dir / subdir / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(dest, "wb") as f:
            await f.write(content)
        return str(dest)

    async def cache_asset(self, db: AsyncSession, video_id: str, url: str, asset_type: AssetType) -> Asset:
        ext = url.rsplit(".", 1)[-1].split("?")[0] if "." in url else "mp4"
        filename = f"{video_id}_{asset_type.value}_{os.urandom(4).hex()}.{ext}"
        local_path = await self.download_stock_video(url, filename)

        asset = Asset(
            video_id=video_id,
            asset_type=asset_type,
            source=AssetSource.STOCK,
            url=url,
            local_path=local_path,
            mime_type=f"video/{ext}" if asset_type == AssetType.VIDEO else f"image/{ext}",
            is_processed=True,
        )
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
        return asset

    def get_tts_output_path(self, script_id: str) -> str:
        return str(self.temp_dir / f"tts_{script_id}.mp3")

    def get_video_output_path(self, video_id: str) -> str:
        return str(self.output_dir / f"video_{video_id}.mp4")

    def get_caption_file_path(self, video_id: str) -> str:
        return str(self.temp_dir / f"captions_{video_id}.srt")

    def cleanup_temp(self, paths: list[str]):
        for p in paths:
            try:
                if os.path.isfile(p):
                    os.remove(p)
                elif os.path.isdir(p):
                    shutil.rmtree(p)
            except OSError:
                pass
