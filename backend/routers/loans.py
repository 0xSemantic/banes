"""
Credex Bank - Loans Router
Loan applications, repayments - all admin-managed
"""
import uuid
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..models.account import Account
from ..models.loan import Loan
from ..models.notification import Notification
from ..schemas import LoanApplicationRequest, LoanRepaymentRequest
from ..services.auth_service import get_current_user
from ..utils import generate_loan_number, calculate_monthly_payment
from ..services.websocket_manager import ws_manager

router = APIRouter()


@router.get("/")
async def get_my_loans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Loan).where(Loan.user_id == current_user.id).order_by(Loan.applied_at.desc())
    )
    loans = result.scalars().all()
    return [_loan_to_dict(l) for l in loans]


@router.post("/apply")
async def apply_for_loan(
    data: LoanApplicationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account
    acc_result = await db.execute(
        select(Account).where(Account.id == data.account_id, Account.user_id == current_user.id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Check no active pending loan
    pending = await db.execute(
        select(Loan).where(
            Loan.user_id == current_user.id,
            Loan.status.in_(["pending", "under_review", "active"])
        )
    )
    if pending.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have an existing active or pending loan")

    from ..config import settings
    if data.amount < settings.MIN_LOAN_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Minimum loan amount is {settings.MIN_LOAN_AMOUNT}")
    if data.amount > settings.MAX_LOAN_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Maximum loan amount is {settings.MAX_LOAN_AMOUNT}")

    monthly_payment = calculate_monthly_payment(data.amount, settings.LOAN_INTEREST_RATE, data.duration_months)

    loan = Loan(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        account_id=account.id,
        loan_number=generate_loan_number(),
        purpose=data.purpose,
        amount_requested=data.amount,
        interest_rate=settings.LOAN_INTEREST_RATE,
        duration_months=data.duration_months,
        monthly_payment=monthly_payment,
        collateral=data.collateral,
        status="pending",
        applied_at=datetime.utcnow()
    )
    db.add(loan)

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="loan_application",
        title="Loan Application",
        message=f"{current_user.full_name} applied for a loan of {account.currency} {data.amount:,.2f} for '{data.purpose}' over {data.duration_months} months.",
        reference_type="loan",
        reference_id=loan.id,
        reference_amount=str(data.amount),
        is_admin_notification=True,
        status="pending",
        priority="high",
        metadata_json=json.dumps({
            "loan_id": loan.id,
            "loan_number": loan.loan_number,
            "amount": data.amount,
            "purpose": data.purpose,
            "duration_months": data.duration_months,
            "monthly_payment": monthly_payment,
            "account_id": account.id
        })
    )
    db.add(notif)
    await db.commit()

    await ws_manager.broadcast_to_admins({
        "type": "new_request",
        "request_type": "loan_application",
        "user": current_user.full_name,
        "amount": data.amount
    })

    return {
        "message": "Loan application submitted successfully. Admin will review shortly.",
        "loan_number": loan.loan_number,
        "monthly_payment": monthly_payment,
        "status": "pending"
    }


@router.post("/repay")
async def repay_loan(
    data: LoanRepaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loan_result = await db.execute(
        select(Loan).where(Loan.id == data.loan_id, Loan.user_id == current_user.id)
    )
    loan = loan_result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if loan.status not in ["active", "overdue"]:
        raise HTTPException(status_code=400, detail="Loan is not active")

    # Get account
    acc_result = await db.execute(select(Account).where(Account.id == loan.account_id))
    account = acc_result.scalar_one_or_none()
    if not account or account.available_balance < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance for repayment")

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="loan_repayment",
        title="Loan Repayment Request",
        message=f"{current_user.full_name} wants to repay {account.currency} {data.amount:,.2f} on loan {loan.loan_number} (outstanding: {account.currency} {loan.outstanding_balance:,.2f}).",
        reference_type="loan",
        reference_id=loan.id,
        reference_amount=str(data.amount),
        is_admin_notification=True,
        status="pending",
        priority="normal",
        metadata_json=json.dumps({
            "loan_id": loan.id,
            "loan_number": loan.loan_number,
            "amount": data.amount,
            "outstanding": loan.outstanding_balance,
            "account_id": account.id
        })
    )
    db.add(notif)
    await db.commit()

    return {"message": "Repayment request submitted. Admin will process shortly."}


def _loan_to_dict(l: Loan) -> dict:
    return {
        "id": l.id,
        "loan_number": l.loan_number,
        "purpose": l.purpose,
        "amount_requested": l.amount_requested,
        "amount_approved": l.amount_approved,
        "amount_disbursed": l.amount_disbursed,
        "amount_repaid": l.amount_repaid,
        "outstanding_balance": l.outstanding_balance,
        "interest_rate": l.interest_rate,
        "duration_months": l.duration_months,
        "monthly_payment": l.monthly_payment,
        "status": l.status,
        "collateral": l.collateral,
        "admin_notes": l.admin_notes,
        "rejection_reason": l.rejection_reason,
        "applied_at": l.applied_at.isoformat(),
        "approved_at": l.approved_at.isoformat() if l.approved_at else None,
        "due_date": l.due_date.isoformat() if l.due_date else None,
    }
