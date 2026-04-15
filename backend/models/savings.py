"""
Credex Bank - Savings Plan Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Float, ForeignKey, Text, Boolean, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..base import Base


class SavingsPlan(Base):
    __tablename__ = "savings_plans"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"), unique=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    tier_name: Mapped[str] = mapped_column(String(50))
    principal: Mapped[float] = mapped_column(Float, default=0.0)
    total_interest_earned: Mapped[float] = mapped_column(Float, default=0.0)
    daily_interest_rate: Mapped[float] = mapped_column(Float, default=0.01)
    last_interest_applied: Mapped[datetime | None] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    target_amount: Mapped[float | None] = mapped_column(Float)
    target_date: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    account: Mapped["Account"] = relationship("Account", back_populates="savings_plan")
