"""
Credex Bank - Notification Model
Central notification hub - all user actions flow here as admin requests
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..base import Base


class Notification(Base):
    __tablename__ = "notifications"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    
    # Notification type determines what action admin needs to take
    notification_type: Mapped[str] = mapped_column(String(50))
    # Types: deposit_request, withdrawal_request, loan_application, loan_repayment,
    #        card_link_request, kyc_submission, savings_activate, transfer_request,
    #        support_ticket, system_alert, account_freeze_request
    
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    
    # Reference to the related entity
    reference_type: Mapped[str | None] = mapped_column(String(50))  # transaction, loan, card, etc.
    reference_id: Mapped[str | None] = mapped_column(String(36))
    reference_amount: Mapped[float | None] = mapped_column(String(50))
    
    # Status tracking
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin_notification: Mapped[bool] = mapped_column(Boolean, default=False)  # For admin panel
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending, in_progress, resolved, dismissed
    
    priority: Mapped[str] = mapped_column(String(10), default="normal")  # low, normal, high, urgent
    admin_response: Mapped[str | None] = mapped_column(Text)
    resolved_by: Mapped[str | None] = mapped_column(String(36))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    
    metadata_json: Mapped[str | None] = mapped_column(Text)  # Extra JSON data
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user: Mapped["User | None"] = relationship("User", back_populates="notifications")
