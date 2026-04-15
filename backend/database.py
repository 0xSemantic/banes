# backend/database.py
import os
import asyncio
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from .base import Base
from .config import settings

if settings.DATABASE_TYPE == "turso":
    from turso import TursoClient

    class TursoAsyncSession:
        """A wrapper that mimics an async SQLAlchemy session."""
        def __init__(self, client):
            self.client = client
            self._transaction = None

        async def execute(self, statement, *args, **kwargs):
            """Execute a raw SQL statement."""
            # Convert SQLAlchemy Core statement to SQL string (simplified)
            if hasattr(statement, 'compile'):
                compiled = str(statement.compile(compile_kwargs={"literal_binds": True}))
            else:
                compiled = str(statement)
            result = await self.client.execute(compiled)
            return result

        async def commit(self):
            # Turso HTTP API is auto-commit; nothing to do here.
            pass

        async def rollback(self):
            # HTTP API doesn't support rollbacks.
            pass

        async def close(self):
            await self.client.close()

        def add(self, obj):
            # Not implemented – use execute() for inserts/updates.
            pass

    @asynccontextmanager
    async def get_db():
        client = TursoClient(
            url=settings.TURSO_HTTP_URL,
            auth_token=settings.TURSO_AUTH_TOKEN
        )
        session = TursoAsyncSession(client)
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def create_tables():
        # With Turso, tables are created automatically on first use.
        print("✅ Database ready (Turso)")

else:
    # Local SQLite (development)
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False}
    )
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def get_db():
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def create_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created (SQLite)")