import asyncio
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from .base import Base
from .config import settings

# Import all models so they register with Base
from .models import account, card, chat, loan, notification, savings, settings_model, transaction

# Choose the appropriate engine based on DATABASE_TYPE
if settings.DATABASE_TYPE == "turso":
    # Use the sqlalchemy-libsql dialect (pure Python, no compilation)
    DATABASE_URL = settings.DATABASE_URL
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={
            "auth_token": settings.TURSO_AUTH_TOKEN,
        }
    )
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
    print("✅ Database tables created")