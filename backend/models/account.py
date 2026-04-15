"""
Credex Bank - Account Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..base import Base


class Account(Base):
    __tablename__ = "accounts"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    account_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    account_type: Mapped[str] = mapped_column(String(20), default="checking")  # checking, savings, fixed
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    balance: Mapped[float] = mapped_column(Float, default=0.0)
    available_balance: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_frozen: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_limit: Mapped[float] = mapped_column(Float, default=10000000.0)
    monthly_limit: Mapped[float] = mapped_column(Float, default=100000000.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user: Mapped["User"] = relationship("User", back_populates="accounts")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="account", foreign_keys="Transaction.account_id")
    savings_plan: Mapped["SavingsPlan | None"] = relationship("SavingsPlan", back_populates="account", uselist=False)
