# backend/database.py
import os
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from .base import Base
from .config import settings

# =========================================================
# TURSO (PRODUCTION)
# =========================================================
if settings.DATABASE_TYPE == "turso":
    from turso_python import TursoClient  # ✅ FIXED IMPORT

    # Create ONE global client (reuse across requests)
    turso_client = TursoClient(
        url=settings.TURSO_HTTP_URL,
        auth_token=settings.TURSO_AUTH_TOKEN
    )

    class TursoAsyncSession:
        """A wrapper that mimics an async SQLAlchemy session."""
        def __init__(self, client):
            self.client = client

        async def execute(self, statement, *args, **kwargs):
            """Execute SQL or SQLAlchemy statement safely."""
            try:
                if hasattr(statement, "compile"):
                    compiled = statement.compile(
                        compile_kwargs={"literal_binds": True}
                    )
                    sql = str(compiled)
                else:
                    sql = str(statement)

                result = await self.client.execute(sql)
                return result

            except Exception as e:
                print(f"❌ Turso execute error: {e}")
                raise

        async def commit(self):
            # Turso auto-commits
            pass

        async def rollback(self):
            # No rollback support
            pass

        async def close(self):
            # Do NOT close global client
            pass

        def add(self, obj):
            # Not supported (use raw SQL)
            raise NotImplementedError("Use execute() for inserts")

    @asynccontextmanager
    async def get_db():
        session = TursoAsyncSession(turso_client)
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

    async def create_tables():
        print("✅ Database ready (Turso)")


# =========================================================
# SQLITE (DEVELOPMENT)
# =========================================================
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False}
    )

    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async def get_db():
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def create_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created (SQLite)")