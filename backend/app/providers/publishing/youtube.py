from abc import ABC, abstractmethod
from typing import Optional
import httpx

from app.config import settings


class YouTubePublisher(ABC):
    @abstractmethod
    async def upload_video(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: list[str],
        category_id: str = "22",
        privacy_status: str = "public",
        made_for_kids: bool = False,
        thumbnail_path: Optional[str] = None,
    ) -> dict:
        ...

    @abstractmethod
    async def get_video_status(self, video_id: str) -> dict:
        ...

    @abstractmethod
    async def get_analytics(self, video_id: str) -> dict:
        ...


class YouTubeAPIPublisher(YouTubePublisher):
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://www.googleapis.com/youtube/v3"
        self.upload_url = "https://www.googleapis.com/upload/youtube/v3"

    async def upload_video(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: list[str],
        category_id: str = "22",
        privacy_status: str = "public",
        made_for_kids: bool = False,
        thumbnail_path: Optional[str] = None,
    ) -> dict:
        body = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": category_id,
            },
            "status": {
                "privacyStatus": privacy_status,
                "madeForKids": made_for_kids,
                "selfDeclaredMadeForKids": made_for_kids,
            },
        }

        async with httpx.AsyncClient() as client:
            upload_url = f"{self.upload_url}/videos?part=snippet,status&access_token={self.access_token}"
            with open(video_path, "rb") as f:
                response = await client.post(
                    upload_url,
                    data=body,
                    files={"video": f},
                )
            response.raise_for_status()
            result = response.json()

            if thumbnail_path:
                thumb_url = f"{self.upload_url}/thumbnails/set?videoId={result['id']}&access_token={self.access_token}"
                with open(thumbnail_path, "rb") as f:
                    await client.post(thumb_url, files={"thumbnail": f})

            return result

    async def get_video_status(self, video_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/videos?part=status&id={video_id}&access_token={self.access_token}"
            response = await client.get(url)
            response.raise_for_status()
            return response.json()

    async def get_analytics(self, video_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/videos?part=statistics&id={video_id}&access_token={self.access_token}"
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
