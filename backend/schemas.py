"""
Credex Bank - Pydantic Schemas
Request/Response models for all API endpoints
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


# ─── AUTH SCHEMAS ────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    full_name: str
    password: str
    phone: Optional[str] = None
    preferred_currency: str = "USD"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    is_admin: bool
    full_name: str


# ─── USER SCHEMAS ─────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    address: Optional[str]
    date_of_birth: Optional[str]
    profile_picture: Optional[str]
    is_admin: bool
    is_active: bool
    is_verified: bool
    kyc_status: str
    preferred_currency: str
    two_factor_enabled: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    preferred_currency: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ─── ACCOUNT SCHEMAS ──────────────────────────────────────────────────────────

class AccountOut(BaseModel):
    id: str
    user_id: str
    account_number: str
    account_type: str
    currency: str
    balance: float
    available_balance: float
    is_active: bool
    is_frozen: bool
    daily_limit: float
    monthly_limit: float
    created_at: datetime

    class Config:
        from_attributes = True

class CreateAccountRequest(BaseModel):
    account_type: str = "checking"
    currency: str = "USD"


# ─── TRANSACTION SCHEMAS ──────────────────────────────────────────────────────

class TransactionOut(BaseModel):
    id: str
    account_id: str
    reference_id: str
    transaction_type: str
    amount: float
    currency: str
    balance_after: float
    description: Optional[str]
    recipient_name: Optional[str]
    recipient_account: Optional[str]
    recipient_bank: Optional[str]
    status: str
    is_debit: bool
    admin_note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class DepositRequest(BaseModel):
    account_id: str
    amount: float
    currency: str = "USD"
    description: Optional[str] = None

class WithdrawalRequest(BaseModel):
    account_id: str
    amount: float
    description: Optional[str] = None
    withdrawal_method: str = "bank_transfer"  # bank_transfer, cash, atm

class TransferRequest(BaseModel):
    from_account_id: str
    recipient_name: str
    recipient_account: str
    recipient_bank: str
    amount: float
    description: Optional[str] = None
    currency: str = "USD"


# ─── SAVINGS SCHEMAS ──────────────────────────────────────────────────────────

class SavingsPlanOut(BaseModel):
    id: str
    account_id: str
    user_id: str
    tier_name: str
    principal: float
    total_interest_earned: float
    daily_interest_rate: float
    last_interest_applied: Optional[datetime]
    is_active: bool
    target_amount: Optional[float]
    target_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class CreateSavingsRequest(BaseModel):
    account_id: str
    target_amount: Optional[float] = None
    target_date: Optional[str] = None

class SavingsTierOut(BaseModel):
    id: str
    name: str
    min_balance: float
    max_balance: float
    daily_interest_rate: float
    color: str
    icon: str
    is_active: bool

    class Config:
        from_attributes = True


# ─── LOAN SCHEMAS ─────────────────────────────────────────────────────────────

class LoanOut(BaseModel):
    id: str
    user_id: str
    account_id: str
    loan_number: str
    purpose: str
    amount_requested: float
    amount_approved: Optional[float]
    amount_disbursed: float
    amount_repaid: float
    outstanding_balance: float
    interest_rate: float
    duration_months: int
    monthly_payment: float
    status: str
    collateral: Optional[str]
    admin_notes: Optional[str]
    rejection_reason: Optional[str]
    applied_at: datetime
    approved_at: Optional[datetime]
    due_date: Optional[datetime]

    class Config:
        from_attributes = True

class LoanApplicationRequest(BaseModel):
    account_id: str
    amount: float
    purpose: str
    duration_months: int = 12
    collateral: Optional[str] = None

class LoanRepaymentRequest(BaseModel):
    loan_id: str
    amount: float


# ─── CARD SCHEMAS ─────────────────────────────────────────────────────────────

class CardOut(BaseModel):
    id: str
    user_id: str
    account_id: str
    card_type: str
    card_network: str
    card_number_masked: str
    card_holder_name: str
    expiry_month: str
    expiry_year: str
    bank_name: Optional[str]
    is_external: bool
    is_active: bool
    is_frozen: bool
    is_default: bool
    daily_limit: float
    online_transactions: bool
    international_transactions: bool
    contactless: bool
    status: str
    color_theme: str
    created_at: datetime

    class Config:
        from_attributes = True

class RequestVirtualCardRequest(BaseModel):
    account_id: str
    card_network: str = "visa"
    color_theme: str = "dark-blue"

class LinkExternalCardRequest(BaseModel):
    account_id: str
    card_number_last4: str
    expiry_month: str
    expiry_year: str
    card_holder_name: str
    bank_name: str
    card_network: str = "visa"


# ─── NOTIFICATION SCHEMAS ─────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: str
    user_id: Optional[str]
    notification_type: str
    title: str
    message: str
    reference_type: Optional[str]
    reference_id: Optional[str]
    reference_amount: Optional[str]
    is_read: bool
    is_admin_notification: bool
    status: str
    priority: str
    admin_response: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class AdminRespondRequest(BaseModel):
    notification_id: str
    action: str  # approve, reject, resolve, dismiss
    response_message: Optional[str] = None
    amount: Optional[float] = None  # For deposit/withdrawal approvals


# ─── ADMIN SCHEMAS ────────────────────────────────────────────────────────────

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    is_frozen: Optional[bool] = None
    kyc_status: Optional[str] = None

class AdminAddFundsRequest(BaseModel):
    account_id: str
    amount: float
    description: str = "Admin credit"

class AdminSavingsTierUpdate(BaseModel):
    name: Optional[str] = None
    min_balance: Optional[float] = None
    max_balance: Optional[float] = None
    daily_interest_rate: Optional[float] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class AdminStatsOut(BaseModel):
    total_users: int
    total_accounts: int
    total_deposits: float
    total_withdrawals: float
    total_loans_active: int
    total_loans_amount: float
    total_savings_plans: int
    pending_requests: int
    total_transactions: int


# ─── CURRENCY SCHEMAS ─────────────────────────────────────────────────────────

class CurrencyRate(BaseModel):
    base: str
    rates: dict
    timestamp: Optional[int] = None
    updated_at: Optional[str] = None

class ConvertRequest(BaseModel):
    amount: float
    from_currency: str
    to_currency: str


# ========== CHAT SCHEMAS ==========
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    sender_id: str   # Changed to str
    content: str
    is_read: bool
    timestamp: datetime

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    pass

class ChatSessionOut(BaseModel):
    id: int
    user_id: str      # Changed to str
    admin_id: Optional[str] = None   # Changed to str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True