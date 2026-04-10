"""
Credex Bank - Savings Router
Savings plan management with automatic interest
"""
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..models.account import Account
from ..models.savings import SavingsPlan
from ..models.notification import Notification
from ..models.settings_model import SavingsTier
from ..schemas import CreateSavingsRequest, SavingsTierOut
from ..services.auth_service import get_current_user
from ..config import settings

router = APIRouter()


@router.get("/tiers", response_model=list[SavingsTierOut])
async def get_savings_tiers(db: AsyncSession = Depends(get_db)):
    """Public endpoint - get available savings tiers"""
    result = await db.execute(
        select(SavingsTier).where(SavingsTier.is_active == True).order_by(SavingsTier.sort_order)
    )
    tiers = result.scalars().all()
    if not tiers:
        # Seed default tiers if none exist
        await seed_default_tiers(db)
        result = await db.execute(select(SavingsTier).order_by(SavingsTier.sort_order))
        tiers = result.scalars().all()
    return tiers


async def seed_default_tiers(db: AsyncSession):
    for i, tier_data in enumerate(settings.DEFAULT_SAVINGS_TIERS):
        tier = SavingsTier(
            id=str(uuid.uuid4()),
            name=tier_data["name"],
            min_balance=tier_data["min_balance"],
            max_balance=tier_data["max_balance"],
            daily_interest_rate=tier_data["daily_interest_rate"],
            color=tier_data["color"],
            icon=tier_data["icon"],
            is_active=True,
            sort_order=i
        )
        db.add(tier)
    await db.commit()


@router.get("/my-plan")
async def get_my_savings_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(SavingsPlan).where(SavingsPlan.user_id == current_user.id, SavingsPlan.is_active == True)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        return None

    acc_result = await db.execute(select(Account).where(Account.id == plan.account_id))
    account = acc_result.scalar_one_or_none()

    return {
        "id": plan.id,
        "account_id": plan.account_id,
        "tier_name": plan.tier_name,
        "principal": plan.principal,
        "total_interest_earned": plan.total_interest_earned,
        "daily_interest_rate": plan.daily_interest_rate,
        "last_interest_applied": plan.last_interest_applied.isoformat() if plan.last_interest_applied else None,
        "is_active": plan.is_active,
        "target_amount": plan.target_amount,
        "target_date": plan.target_date.isoformat() if plan.target_date else None,
        "created_at": plan.created_at.isoformat(),
        "current_balance": account.balance if account else plan.principal
    }


@router.post("/activate")
async def activate_savings(
    data: CreateSavingsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate savings plan on an account"""
    # Check account ownership
    acc_result = await db.execute(
        select(Account).where(Account.id == data.account_id, Account.user_id == current_user.id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Check no existing plan
    existing = await db.execute(
        select(SavingsPlan).where(SavingsPlan.account_id == data.account_id, SavingsPlan.is_active == True)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Savings plan already active on this account")

    # Get appropriate tier
    tier_result = await db.execute(
        select(SavingsTier).where(
            SavingsTier.is_active == True,
            SavingsTier.min_balance <= account.balance
        ).order_by(SavingsTier.min_balance.desc())
    )
    tier = tier_result.scalar_one_or_none()
    if not tier:
        # Get lowest tier
        tier_result = await db.execute(
            select(SavingsTier).where(SavingsTier.is_active == True).order_by(SavingsTier.min_balance)
        )
        tier = tier_result.scalar_one_or_none()

    target_date = None
    if data.target_date:
        try:
            target_date = datetime.fromisoformat(data.target_date)
        except ValueError:
            pass

    plan = SavingsPlan(
        id=str(uuid.uuid4()),
        account_id=account.id,
        user_id=current_user.id,
        tier_name=tier.name if tier else "Basic Saver",
        principal=account.balance,
        total_interest_earned=0.0,
        daily_interest_rate=tier.daily_interest_rate if tier else 0.01,
        is_active=True,
        target_amount=data.target_amount,
        target_date=target_date,
        created_at=datetime.utcnow()
    )
    db.add(plan)

    # Notify admin
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="savings_activate",
        title="Savings Plan Activated",
        message=f"{current_user.full_name} activated a savings plan on account {account.account_number}. Tier: {plan.tier_name}",
        is_admin_notification=True,
        status="resolved",  # Auto-resolve - no admin action needed
        priority="low"
    )
    db.add(notif)
    await db.commit()

    return {"message": "Savings plan activated successfully", "tier": plan.tier_name, "daily_rate": plan.daily_interest_rate}


@router.post("/deactivate/{plan_id}")
async def deactivate_savings(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(SavingsPlan).where(SavingsPlan.id == plan_id, SavingsPlan.user_id == current_user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Savings plan not found")

    plan.is_active = False
    await db.commit()
    return {"message": "Savings plan deactivated"}
