"""
Credex Bank - App Settings Model
Admin-configurable settings stored in database
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Float, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class AppSetting(Base):
    __tablename__ = "app_settings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text)
    value_type: Mapped[str] = mapped_column(String(20), default="string")  # string, number, boolean, json
    category: Mapped[str] = mapped_column(String(50), default="general")
    description: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)  # Can user frontend read this?
    updated_by: Mapped[str | None] = mapped_column(String(36))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SavingsTier(Base):
    __tablename__ = "savings_tiers"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    min_balance: Mapped[float] = mapped_column(Float, default=0.0)
    max_balance: Mapped[float] = mapped_column(Float, default=9999.0)
    daily_interest_rate: Mapped[float] = mapped_column(Float, default=0.01)
    color: Mapped[str] = mapped_column(String(20), default="#10b981")
    icon: Mapped[str] = mapped_column(String(50), default="piggy-bank")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
