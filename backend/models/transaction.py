"""
Credex Bank - Transaction Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..base import Base


class Transaction(Base):
    __tablename__ = "transactions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"))
    reference_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    transaction_type: Mapped[str] = mapped_column(String(30))
    # Types: deposit, withdrawal, transfer_in, transfer_out, loan_disbursement, loan_repayment,
    #        savings_interest, card_payment, fee, reversal
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    balance_after: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[str | None] = mapped_column(Text)
    recipient_name: Mapped[str | None] = mapped_column(String(255))
    recipient_account: Mapped[str | None] = mapped_column(String(50))
    recipient_bank: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, completed, failed, reversed
    initiated_by: Mapped[str | None] = mapped_column(String(36))  # user_id or "system" or "admin"
    admin_note: Mapped[str | None] = mapped_column(Text)
    is_debit: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_json: Mapped[str | None] = mapped_column(Text)  # JSON string for extra data
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    account: Mapped["Account"] = relationship("Account", back_populates="transactions", foreign_keys=[account_id])
