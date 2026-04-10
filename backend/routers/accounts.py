"""
Credex Bank - Accounts Router
Account management, balance queries
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..models.account import Account
from ..models.transaction import Transaction
from ..schemas import AccountOut, CreateAccountRequest
from ..services.auth_service import get_current_user
from ..utils import generate_account_number

router = APIRouter()


@router.get("/", response_model=list[AccountOut])
async def get_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Account).where(Account.user_id == current_user.id, Account.is_active == True)
    )
    return result.scalars().all()


@router.get("/{account_id}", response_model=AccountOut)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.post("/", response_model=AccountOut, status_code=201)
async def create_account(
    data: CreateAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Limit: max 3 accounts per user
    result = await db.execute(select(Account).where(Account.user_id == current_user.id))
    existing = result.scalars().all()
    if len(existing) >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 accounts allowed per user")

    account = Account(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        account_number=generate_account_number(),
        account_type=data.account_type,
        currency=data.currency,
        balance=0.0,
        available_balance=0.0,
        is_active=True
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.get("/{account_id}/transactions")
async def get_account_transactions(
    account_id: str,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account ownership
    acc_result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    result = await db.execute(
        select(Transaction)
        .where(Transaction.account_id == account_id)
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    transactions = result.scalars().all()
    return [
        {
            "id": t.id,
            "reference_id": t.reference_id,
            "transaction_type": t.transaction_type,
            "amount": t.amount,
            "currency": t.currency,
            "balance_after": t.balance_after,
            "description": t.description,
            "recipient_name": t.recipient_name,
            "recipient_account": t.recipient_account,
            "recipient_bank": t.recipient_bank,
            "status": t.status,
            "is_debit": t.is_debit,
            "admin_note": t.admin_note,
            "created_at": t.created_at.isoformat()
        }
        for t in transactions
    ]
