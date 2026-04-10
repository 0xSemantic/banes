"""
Credex Bank - Transactions Router
All money movement requests - routes to admin for approval
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
from ..models.transaction import Transaction
from ..models.notification import Notification
from ..schemas import DepositRequest, WithdrawalRequest, TransferRequest
from ..services.auth_service import get_current_user
from ..services.websocket_manager import ws_manager

router = APIRouter()


@router.post("/deposit-request")
async def request_deposit(
    data: DepositRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """User requests to deposit money - admin must approve"""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Verify account ownership
    acc_result = await db.execute(
        select(Account).where(Account.id == data.account_id, Account.user_id == current_user.id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Create pending transaction
    txn = Transaction(
        id=str(uuid.uuid4()),
        account_id=account.id,
        reference_id=str(uuid.uuid4()),
        transaction_type="deposit",
        amount=data.amount,
        currency=data.currency or account.currency,
        balance_after=account.balance,  # Will update when admin approves
        description=data.description or f"Deposit request - {data.currency or account.currency} {data.amount}",
        status="pending",
        initiated_by=current_user.id,
        is_debit=False
    )
    db.add(txn)

    # Notify admin
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="deposit_request",
        title="Deposit Request",
        message=f"{current_user.full_name} requests to deposit {data.currency or account.currency} {data.amount:,.2f} into account {account.account_number}.",
        reference_type="transaction",
        reference_id=txn.id,
        reference_amount=str(data.amount),
        is_admin_notification=True,
        status="pending",
        priority="high",
        metadata_json=json.dumps({
            "account_id": account.id,
            "account_number": account.account_number,
            "amount": data.amount,
            "currency": data.currency or account.currency,
            "user_name": current_user.full_name,
            "transaction_id": txn.id
        })
    )
    db.add(notif)
    await db.commit()

    # Real-time notify admin
    await ws_manager.broadcast_to_admins({
        "type": "new_request",
        "request_type": "deposit_request",
        "user": current_user.full_name,
        "amount": data.amount,
        "currency": data.currency or account.currency
    })

    return {
        "message": "Deposit request submitted. Admin will process shortly.",
        "reference_id": txn.reference_id,
        "amount": data.amount,
        "status": "pending"
    }


@router.post("/withdrawal-request")
async def request_withdrawal(
    data: WithdrawalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """User requests withdrawal - admin must approve"""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    acc_result = await db.execute(
        select(Account).where(Account.id == data.account_id, Account.user_id == current_user.id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if account.is_frozen:
        raise HTTPException(status_code=403, detail="Account is frozen")

    if account.available_balance < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Hold the amount (pending)
    account.available_balance -= data.amount

    txn = Transaction(
        id=str(uuid.uuid4()),
        account_id=account.id,
        reference_id=str(uuid.uuid4()),
        transaction_type="withdrawal",
        amount=data.amount,
        currency=account.currency,
        balance_after=account.balance,
        description=data.description or f"Withdrawal via {data.withdrawal_method}",
        status="pending",
        initiated_by=current_user.id,
        is_debit=True
    )
    db.add(txn)

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="withdrawal_request",
        title="Withdrawal Request",
        message=f"{current_user.full_name} requests to withdraw {account.currency} {data.amount:,.2f} from account {account.account_number} via {data.withdrawal_method}.",
        reference_type="transaction",
        reference_id=txn.id,
        reference_amount=str(data.amount),
        is_admin_notification=True,
        status="pending",
        priority="high",
        metadata_json=json.dumps({
            "account_id": account.id,
            "account_number": account.account_number,
            "amount": data.amount,
            "currency": account.currency,
            "method": data.withdrawal_method,
            "transaction_id": txn.id
        })
    )
    db.add(notif)
    await db.commit()

    await ws_manager.broadcast_to_admins({
        "type": "new_request",
        "request_type": "withdrawal_request",
        "user": current_user.full_name,
        "amount": data.amount
    })

    return {
        "message": "Withdrawal request submitted. Admin will process shortly.",
        "reference_id": txn.reference_id,
        "status": "pending"
    }


@router.post("/transfer-request")
async def request_transfer(
    data: TransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Interbank transfer request - goes to admin"""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    acc_result = await db.execute(
        select(Account).where(Account.id == data.from_account_id, Account.user_id == current_user.id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if account.available_balance < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    if account.is_frozen:
        raise HTTPException(status_code=403, detail="Account is frozen")

    account.available_balance -= data.amount

    txn = Transaction(
        id=str(uuid.uuid4()),
        account_id=account.id,
        reference_id=str(uuid.uuid4()),
        transaction_type="transfer_out",
        amount=data.amount,
        currency=data.currency or account.currency,
        balance_after=account.balance,
        description=data.description or f"Transfer to {data.recipient_name}",
        recipient_name=data.recipient_name,
        recipient_account=data.recipient_account,
        recipient_bank=data.recipient_bank,
        status="pending",
        initiated_by=current_user.id,
        is_debit=True
    )
    db.add(txn)

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="transfer_request",
        title="Transfer Request",
        message=f"{current_user.full_name} requests to transfer {account.currency} {data.amount:,.2f} to {data.recipient_name} at {data.recipient_bank} (A/C: {data.recipient_account}).",
        reference_type="transaction",
        reference_id=txn.id,
        reference_amount=str(data.amount),
        is_admin_notification=True,
        status="pending",
        priority="high",
        metadata_json=json.dumps({
            "account_id": account.id,
            "transaction_id": txn.id,
            "recipient_name": data.recipient_name,
            "recipient_account": data.recipient_account,
            "recipient_bank": data.recipient_bank,
            "amount": data.amount
        })
    )
    db.add(notif)
    await db.commit()

    return {
        "message": "Transfer request submitted. Admin will process shortly.",
        "reference_id": txn.reference_id,
        "status": "pending"
    }


@router.get("/")
async def get_all_transactions(
    limit: int = 30,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all transactions for current user across all accounts"""
    from sqlalchemy import text
    
    # Get all user account IDs
    acc_result = await db.execute(
        select(Account.id).where(Account.user_id == current_user.id)
    )
    account_ids = [row[0] for row in acc_result.all()]

    if not account_ids:
        return []

    result = await db.execute(
        select(Transaction)
        .where(Transaction.account_id.in_(account_ids))
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    transactions = result.scalars().all()
    return [
        {
            "id": t.id,
            "account_id": t.account_id,
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
