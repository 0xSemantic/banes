"""
Credex Bank - Users Router
Profile management, KYC, preferences
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..schemas import UserUpdate, ChangePasswordRequest, UserOut
from ..services.auth_service import get_current_user, verify_password, get_password_hash

router = APIRouter()


@router.get("/profile", response_model=UserOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile")
async def update_profile(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    current_user.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "Profile updated successfully"}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.hashed_password = get_password_hash(data.new_password)
    current_user.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "Password changed successfully"}


@router.post("/kyc-submit")
async def submit_kyc(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger KYC verification request to admin"""
    from ..models.notification import Notification
    import uuid

    if current_user.kyc_status == "verified":
        raise HTTPException(status_code=400, detail="KYC already verified")

    current_user.kyc_status = "pending"
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="kyc_submission",
        title="KYC Verification Request",
        message=f"{current_user.full_name} has submitted KYC documents for verification.",
        is_admin_notification=True,
        status="pending",
        priority="high"
    )
    db.add(notif)
    await db.commit()
    return {"message": "KYC submitted. Admin will verify shortly."}
