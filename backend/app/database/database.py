from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker

from sqlalchemy.orm import declarative_base

from app.core.config import settings


# ─────────────────────────────────────────────────────────────
# DATABASE URL
# ─────────────────────────────────────────────────────────────

DATABASE_URL = settings.DATABASE_URL


# ─────────────────────────────────────────────────────────────
# ASYNC ENGINE
# ─────────────────────────────────────────────────────────────

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
)


# ─────────────────────────────────────────────────────────────
# SESSION
# ─────────────────────────────────────────────────────────────

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ─────────────────────────────────────────────────────────────
# BASE
# ─────────────────────────────────────────────────────────────

Base = declarative_base()


# ─────────────────────────────────────────────────────────────
# GET DB
# ─────────────────────────────────────────────────────────────

async def get_db():

    async with AsyncSessionLocal() as session:
        yield session