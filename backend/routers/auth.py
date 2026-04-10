"""
Credex Bank - Authentication Router
Handles registration, login, token refresh
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..models.account import Account
from ..models.notification import Notification
from ..schemas import LoginRequest, RegisterRequest, TokenResponse
from ..services.auth_service import get_password_hash, verify_password, create_access_token, get_current_user
from ..utils import generate_account_number

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        id=str(uuid.uuid4()),
        email=data.email.lower(),
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        phone=data.phone,
        preferred_currency=data.preferred_currency,
        is_active=True,
        is_verified=False,
        kyc_status="pending",
        created_at=datetime.utcnow()
    )
    db.add(user)
    await db.flush()

    # Auto-create a checking account
    account = Account(
        id=str(uuid.uuid4()),
        user_id=user.id,
        account_number=generate_account_number(),
        account_type="checking",
        currency=data.preferred_currency,
        balance=0.0,
        available_balance=0.0,
        is_active=True
    )
    db.add(account)

    # Notify admin of new registration
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=user.id,
        notification_type="new_registration",
        title=f"New User Registration",
        message=f"{data.full_name} ({data.email}) has registered and is awaiting KYC verification.",
        is_admin_notification=True,
        status="pending",
        priority="normal"
    )
    db.add(notif)
    await db.commit()

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        is_admin=user.is_admin,
        full_name=user.full_name
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Please contact support.")

    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        is_admin=user.is_admin,
        full_name=user.full_name
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "address": current_user.address,
        "date_of_birth": current_user.date_of_birth,
        "profile_picture": current_user.profile_picture,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "kyc_status": current_user.kyc_status,
        "preferred_currency": current_user.preferred_currency,
        "two_factor_enabled": current_user.two_factor_enabled,
        "created_at": current_user.created_at.isoformat(),
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }
