from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,   # SQL sorgularını terminale yaz (geliştirme için)
    pool_size=10,
    max_overflow=20,
)

# ── Session Factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ── Base Model ────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency: Her request için DB session ───────────────────────────────────
async def get_db() -> AsyncSession:
    """
    FastAPI dependency injection ile kullanılır.
    
    Kullanım:
        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
