from abc import ABC, abstractmethod
from typing import Optional
import httpx

from app.config import settings


class InstagramPublisher(ABC):
    @abstractmethod
    async def create_reel_container(self, video_url: str, caption: str) -> str:
        ...

    @abstractmethod
    async def publish_container(self, container_id: str) -> str:
        ...

    @abstractmethod
    async def get_container_status(self, container_id: str) -> dict:
        ...


class InstagramGraphAPIPublisher(InstagramPublisher):
    def __init__(self, access_token: str, business_account_id: str):
        self.access_token = access_token
        self.business_account_id = business_account_id
        self.api_version = "v21.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"

    async def create_reel_container(self, video_url: str, caption: str) -> str:
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/{self.business_account_id}/media"
            params = {
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "access_token": self.access_token,
            }
            response = await client.post(url, params=params)
            response.raise_for_status()
            result = response.json()
            return result["id"]

    async def publish_container(self, container_id: str) -> str:
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/{self.business_account_id}/media_publish"
            params = {
                "creation_id": container_id,
                "access_token": self.access_token,
            }
            response = await client.post(url, params=params)
            response.raise_for_status()
            result = response.json()
            return result["id"]

    async def get_container_status(self, container_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/{container_id}"
            params = {
                "fields": "status_code,status",
                "access_token": self.access_token,
            }
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
