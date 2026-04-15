"""
Credex Bank - User Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Float, Text, ForeignKey, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..base import Base


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(Text)
    date_of_birth: Mapped[str | None] = mapped_column(String(20))
    profile_picture: Mapped[str | None] = mapped_column(String(500))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    kyc_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, verified, rejected
    preferred_currency: Mapped[str] = mapped_column(String(10), default="USD")
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login: Mapped[datetime | None] = mapped_column(DateTime)
    
    accounts: Mapped[list["Account"]] = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user")
    loans: Mapped[list["Loan"]] = relationship("Loan", back_populates="user")
    cards: Mapped[list["Card"]] = relationship("Card", back_populates="user")
    
