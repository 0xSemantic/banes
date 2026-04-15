import asyncio
from contextlib import asynccontextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from .base import Base
from .config import settings

# 1. Create the sync engine (works for both Turso and local SQLite)
if settings.DATABASE_TYPE == "turso":
    # Turso requires the libsql driver – import it to register the dialect
    import libsql
    engine = create_engine(
        settings.DATABASE_URL,
        echo=False,
        connect_args={"auth_token": settings.TURSO_AUTH_TOKEN}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False}
    )

SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 2. Async wrapper that runs all sync calls in a thread pool
class AsyncSessionProxy:
    """Proxies a sync SQLAlchemy session, making all methods awaitable."""
    def __init__(self, session: Session):
        self._session = session

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    def __getattr__(self, name):
        attr = getattr(self._session, name)
        if callable(attr):
            async def async_wrapper(*args, **kwargs):
                return await asyncio.to_thread(attr, *args, **kwargs)
            return async_wrapper
        return attr

@asynccontextmanager
async def get_db():
    """Async context manager that yields an async‑capable database session."""
    session = await asyncio.to_thread(SyncSessionLocal)
    proxy = AsyncSessionProxy(session)
    try:
        yield proxy
        await asyncio.to_thread(session.commit)
    except Exception:
        await asyncio.to_thread(session.rollback)
        raise
    finally:
        await asyncio.to_thread(session.close)

async def create_tables():
    """Create all tables (runs sync table creation in a thread)."""
    def _create():
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created")
    await asyncio.to_thread(_create)