import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.models.user import User
from app.services.auth import (
    create_user, get_user_by_email, get_user_by_id,
    verify_password, hash_password, create_access_token, create_refresh_token, decode_token
)


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestingSessionLocal() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_hash_and_verify_password():
    password = "SecurePass123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.asyncio
async def test_create_user(db: AsyncSession):
    user = await create_user(db, "test@example.com", "mypassword", "Test User")
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.display_name == "Test User"
    assert user.is_active is True
    assert verify_password("mypassword", user.password_hash)


@pytest.mark.asyncio
async def test_get_user_by_email(db: AsyncSession):
    await create_user(db, "find@example.com", "pass123", "Find Me")
    found = await get_user_by_email(db, "find@example.com")
    assert found is not None
    assert found.email == "find@example.com"

    not_found = await get_user_by_email(db, "nobody@example.com")
    assert not_found is None


@pytest.mark.asyncio
async def test_get_user_by_id(db: AsyncSession):
    user = await create_user(db, "byid@example.com", "pass123", "By ID")
    found = await get_user_by_id(db, user.id)
    assert found is not None
    assert found.id == user.id


@pytest.mark.asyncio
async def test_jwt_tokens():
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    decoded_access = decode_token(access_token)
    assert decoded_access is not None
    assert decoded_access["sub"] == user_id
    assert decoded_access["type"] == "access"

    decoded_refresh = decode_token(refresh_token)
    assert decoded_refresh is not None
    assert decoded_refresh["sub"] == user_id
    assert decoded_refresh["type"] == "refresh"


@pytest.mark.asyncio
async def test_invalid_token():
    decoded = decode_token("invalid.token.here")
    assert decoded is None
