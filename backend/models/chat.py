from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from ..base import Base  # assuming Base is in base.py

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)   # Changed to String
    admin_id = Column(String(36), ForeignKey("users.id"), nullable=True)    # Changed to String
    status = Column(String, default="open")  # open, closed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    admin = relationship("User", foreign_keys=[admin_id])
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)   # Changed to String
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
    sender = relationship("User")