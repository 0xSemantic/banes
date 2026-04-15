# backend/database.py
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from .base import Base
from .config import settings

# =========================================================
# TURSO (PRODUCTION)
# =========================================================
if settings.DATABASE_TYPE == "turso":
    from turso_python import TursoClient

    # ✅ FIXED: correct init (NO keyword args)
    turso_client = TursoClient(
        settings.TURSO_HTTP_URL,
        settings.TURSO_AUTH_TOKEN
    )

    class TursoAsyncSession:
        def __init__(self, client):
            self.client = client

        async def execute(self, statement, *args, **kwargs):
            try:
                if hasattr(statement, "compile"):
                    compiled = statement.compile(
                        compile_kwargs={"literal_binds": True}
                    )
                    sql = str(compiled)
                else:
                    sql = str(statement)

                return await self.client.execute(sql)

            except Exception as e:
                print(f"❌ Turso execute error: {e}")
                raise

        async def commit(self):
            pass

        async def rollback(self):
            pass

        async def close(self):
            pass

        def add(self, obj):
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