"""
Credex Bank - Loan Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Float, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Loan(Base):
    __tablename__ = "loans"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"))
    loan_number: Mapped[str] = mapped_column(String(20), unique=True)
    purpose: Mapped[str] = mapped_column(String(255))
    amount_requested: Mapped[float] = mapped_column(Float)
    amount_approved: Mapped[float | None] = mapped_column(Float)
    amount_disbursed: Mapped[float] = mapped_column(Float, default=0.0)
    amount_repaid: Mapped[float] = mapped_column(Float, default=0.0)
    outstanding_balance: Mapped[float] = mapped_column(Float, default=0.0)
    interest_rate: Mapped[float] = mapped_column(Float, default=5.0)  # % per month
    duration_months: Mapped[int] = mapped_column(Integer, default=12)
    monthly_payment: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending, under_review, approved, active, overdue, completed, rejected
    collateral: Mapped[str | None] = mapped_column(Text)
    admin_notes: Mapped[str | None] = mapped_column(Text)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    disbursed_at: Mapped[datetime | None] = mapped_column(DateTime)
    due_date: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    
    user: Mapped["User"] = relationship("User", back_populates="loans")
