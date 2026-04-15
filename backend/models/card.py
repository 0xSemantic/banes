"""
Credex Bank - Card Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..base import Base


class Card(Base):
    __tablename__ = "cards"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"))
    
    card_type: Mapped[str] = mapped_column(String(20))  # virtual, physical, linked_external
    card_network: Mapped[str] = mapped_column(String(20), default="visa")  # visa, mastercard, verve
    card_number_masked: Mapped[str] = mapped_column(String(20))  # Last 4 digits shown
    card_holder_name: Mapped[str] = mapped_column(String(255))
    expiry_month: Mapped[str] = mapped_column(String(2))
    expiry_year: Mapped[str] = mapped_column(String(4))
    
    # For linked external cards
    bank_name: Mapped[str | None] = mapped_column(String(255))
    is_external: Mapped[bool] = mapped_column(Boolean, default=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_frozen: Mapped[bool] = mapped_column(Boolean, default=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    
    daily_limit: Mapped[float] = mapped_column(Float, default=2000.0)
    online_transactions: Mapped[bool] = mapped_column(Boolean, default=True)
    international_transactions: Mapped[bool] = mapped_column(Boolean, default=False)
    contactless: Mapped[bool] = mapped_column(Boolean, default=True)
    
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, active, blocked, expired
    color_theme: Mapped[str] = mapped_column(String(20), default="dark-blue")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime)
    
    user: Mapped["User"] = relationship("User", back_populates="cards")
