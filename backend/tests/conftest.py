from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import asyncpg
import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from takehome.db.session import get_session
from takehome.web.routers import conversations, documents, messages

_TEST_DB_URL = "postgresql+asyncpg://orbital:orbital@db:5432/orbital_takehome_test"


@pytest.fixture(scope="session", autouse=True)
def _setup_test_db():
    """Create an isolated test database and run migrations once per session."""

    async def _create_db():
        conn = await asyncpg.connect(
            user="orbital",
            password="orbital",
            host="db",
            port=5432,
            database="orbital_takehome",
        )
        try:
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = 'orbital_takehome_test'"
            )
            if not exists:
                await conn.execute("CREATE DATABASE orbital_takehome_test")
        finally:
            await conn.close()

    asyncio.run(_create_db())

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", _TEST_DB_URL)
    command.upgrade(alembic_cfg, "head")


# Test engine with NullPool pointing at the isolated test database.
_test_engine = create_async_engine(_TEST_DB_URL, poolclass=NullPool)
_test_session = async_sessionmaker(_test_engine, class_=AsyncSession, expire_on_commit=False)


async def _get_test_session() -> AsyncGenerator[AsyncSession, None]:
    async with _test_session() as session:
        yield session


# Test app without the alembic migration lifespan.
_test_app = FastAPI(title="Test")
_test_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
_test_app.include_router(conversations.router)
_test_app.include_router(messages.router)
_test_app.include_router(documents.router)
_test_app.dependency_overrides[get_session] = _get_test_session


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=_test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        # Clean up test data from previous runs
        res = await c.get("/api/conversations")
        if res.status_code == 200:
            for conv in res.json():
                await c.delete(f"/api/conversations/{conv['id']}")
        yield c


@pytest.fixture
async def conversation(client: AsyncClient) -> dict:
    """Create a conversation and return its detail."""
    res = await client.post("/api/conversations")
    assert res.status_code == 201
    return res.json()
