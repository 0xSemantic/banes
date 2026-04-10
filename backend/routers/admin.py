"""
Credex Bank - Admin Router
Full admin control panel - approves/rejects all requests,
manages users, accounts, savings tiers, and system settings
"""
import uuid
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from ..database import get_db
from ..models.user import User
from ..models.account import Account
from ..models.transaction import Transaction
from ..models.savings import SavingsPlan
from ..models.loan import Loan
from ..models.notification import Notification
from ..models.card import Card
from ..models.settings_model import AppSetting, SavingsTier
from ..schemas import AdminUserUpdate, AdminAddFundsRequest, AdminSavingsTierUpdate, AdminRespondRequest
from ..services.auth_service import get_current_admin
from ..services.websocket_manager import ws_manager
from ..utils import generate_card_number_masked, calculate_monthly_payment

router = APIRouter()


# ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    total_users = (await db.execute(select(func.count(User.id)).where(User.is_admin == False))).scalar()
    total_accounts = (await db.execute(select(func.count(Account.id)))).scalar()
    
    total_deposits = (await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.transaction_type == "deposit", Transaction.status == "completed")
    )).scalar()

    total_withdrawals = (await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.transaction_type == "withdrawal", Transaction.status == "completed")
    )).scalar()

    total_loans_active = (await db.execute(
        select(func.count(Loan.id)).where(Loan.status.in_(["active", "overdue"]))
    )).scalar()

    total_loans_amount = (await db.execute(
        select(func.coalesce(func.sum(Loan.outstanding_balance), 0))
        .where(Loan.status.in_(["active", "overdue"]))
    )).scalar()

    total_savings = (await db.execute(
        select(func.count(SavingsPlan.id)).where(SavingsPlan.is_active == True)
    )).scalar()

    pending_requests = (await db.execute(
        select(func.count(Notification.id))
        .where(Notification.is_admin_notification == True, Notification.status == "pending")
    )).scalar()

    total_transactions = (await db.execute(select(func.count(Transaction.id)))).scalar()

    total_balance = (await db.execute(
        select(func.coalesce(func.sum(Account.balance), 0))
    )).scalar()

    return {
        "total_users": total_users,
        "total_accounts": total_accounts,
        "total_deposits": round(float(total_deposits), 2),
        "total_withdrawals": round(float(total_withdrawals), 2),
        "total_loans_active": total_loans_active,
        "total_loans_amount": round(float(total_loans_amount), 2),
        "total_savings_plans": total_savings,
        "pending_requests": pending_requests,
        "total_transactions": total_transactions,
        "total_balance_managed": round(float(total_balance), 2)
    }


# ─── NOTIFICATION / REQUEST MANAGEMENT ───────────────────────────────────────

@router.get("/notifications")
async def get_admin_notifications(
    limit: int = 50,
    offset: int = 0,
    status_filter: str = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(Notification).where(Notification.is_admin_notification == True)
    if status_filter:
        query = query.where(Notification.status == status_filter)
    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    notifications = result.scalars().all()

    # Enrich with user info
    enriched = []
    for n in notifications:
        d = {
            "id": n.id,
            "user_id": n.user_id,
            "notification_type": n.notification_type,
            "title": n.title,
            "message": n.message,
            "reference_type": n.reference_type,
            "reference_id": n.reference_id,
            "reference_amount": n.reference_amount,
            "status": n.status,
            "priority": n.priority,
            "admin_response": n.admin_response,
            "is_read": n.is_read,
            "metadata": json.loads(n.metadata_json) if n.metadata_json else {},
            "resolved_at": n.resolved_at.isoformat() if n.resolved_at else None,
            "created_at": n.created_at.isoformat()
        }
        if n.user_id:
            u = (await db.execute(select(User).where(User.id == n.user_id))).scalar_one_or_none()
            if u:
                d["user_name"] = u.full_name
                d["user_email"] = u.email
        enriched.append(d)

    return enriched


@router.post("/notifications/respond")
async def respond_to_notification(
    data: AdminRespondRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Master handler for all admin actions on notifications"""
    notif_result = await db.execute(select(Notification).where(Notification.id == data.notification_id))
    notif = notif_result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    now = datetime.utcnow()
    notif.is_read = True
    notif.admin_response = data.response_message
    notif.resolved_by = admin.id
    notif.resolved_at = now

    result_message = "Action completed"

    # ── DEPOSIT APPROVAL ──────────────────────────────────────────────────────
    if notif.notification_type == "deposit_request":
        meta = json.loads(notif.metadata_json) if notif.metadata_json else {}
        txn_result = await db.execute(select(Transaction).where(Transaction.id == meta.get("transaction_id")))
        txn = txn_result.scalar_one_or_none()
        acc_result = await db.execute(select(Account).where(Account.id == meta.get("account_id")))
        account = acc_result.scalar_one_or_none()

        if data.action == "approve" and txn and account:
            amount = data.amount or float(meta.get("amount", 0))
            account.balance += amount
            account.available_balance += amount
            txn.status = "completed"
            txn.balance_after = account.balance
            txn.admin_note = data.response_message
            notif.status = "resolved"
            # Notify user
            await _create_user_notification(db, notif.user_id, "deposit_approved",
                "Deposit Approved ✅",
                f"Your deposit of {meta.get('currency', 'USD')} {amount:,.2f} has been approved and credited to your account.")
            result_message = f"Deposit of {amount:,.2f} approved and credited"
        elif data.action == "reject" and txn:
            txn.status = "failed"
            txn.admin_note = data.response_message
            notif.status = "resolved"
            await _create_user_notification(db, notif.user_id, "deposit_rejected",
                "Deposit Request Declined",
                f"Your deposit request has been declined. Reason: {data.response_message or 'Contact support'}")
            result_message = "Deposit rejected"

    # ── WITHDRAWAL APPROVAL ───────────────────────────────────────────────────
    elif notif.notification_type == "withdrawal_request":
        meta = json.loads(notif.metadata_json) if notif.metadata_json else {}
        txn_result = await db.execute(select(Transaction).where(Transaction.id == meta.get("transaction_id")))
        txn = txn_result.scalar_one_or_none()
        acc_result = await db.execute(select(Account).where(Account.id == meta.get("account_id")))
        account = acc_result.scalar_one_or_none()

        if data.action == "approve" and txn and account:
            amount = float(meta.get("amount", 0))
            account.balance -= amount
            # available_balance was already deducted when request was made
            txn.status = "completed"
            txn.balance_after = account.balance
            txn.admin_note = data.response_message
            notif.status = "resolved"
            await _create_user_notification(db, notif.user_id, "withdrawal_approved",
                "Withdrawal Approved ✅",
                f"Your withdrawal of {meta.get('currency', 'USD')} {amount:,.2f} has been processed.")
            result_message = f"Withdrawal of {amount:,.2f} approved"
        elif data.action == "reject" and txn and account:
            # Restore held balance
            amount = float(meta.get("amount", 0))
            account.available_balance += amount
            txn.status = "failed"
            notif.status = "resolved"
            await _create_user_notification(db, notif.user_id, "withdrawal_rejected",
                "Withdrawal Request Declined",
                f"Your withdrawal request was declined. {data.response_message or ''}")
            result_message = "Withdrawal rejected, funds restored"

    # ── TRANSFER APPROVAL ─────────────────────────────────────────────────────
    elif notif.notification_type == "transfer_request":
        meta = json.loads(notif.metadata_json) if notif.metadata_json else {}
        txn_result = await db.execute(select(Transaction).where(Transaction.id == meta.get("transaction_id")))
        txn = txn_result.scalar_one_or_none()
        acc_result = await db.execute(select(Account).where(Account.id == meta.get("account_id")))
        account = acc_result.scalar_one_or_none()

        if data.action == "approve" and txn and account:
            amount = float(meta.get("amount", 0))
            account.balance -= amount
            txn.status = "completed"
            txn.balance_after = account.balance
            notif.status = "resolved"
            await _create_user_notification(db, notif.user_id, "transfer_approved",
                "Transfer Completed ✅",
                f"Your transfer of {amount:,.2f} to {meta.get('recipient_name')} has been processed.")
            result_message = "Transfer approved"
        elif data.action == "reject" and txn and account:
            amount = float(meta.get("amount", 0))
            account.available_balance += amount
            txn.status = "failed"
            notif.status = "resolved"
            result_message = "Transfer rejected"

    # ── LOAN APPROVAL ─────────────────────────────────────────────────────────
    elif notif.notification_type == "loan_application":
        meta = json.loads(notif.metadata_json) if notif.metadata_json else {}
        loan_result = await db.execute(select(Loan).where(Loan.id == meta.get("loan_id")))
        loan = loan_result.scalar_one_or_none()
        acc_result = await db.execute(select(Account).where(Account.id == meta.get("account_id")))
        account = acc_result.scalar_one_or_none()

        if data.action == "approve" and loan and account:
            approved_amount = data.amount or loan.amount_requested
            loan.status = "active"
            loan.amount_approved = approved_amount
            loan.amount_disbursed = approved_amount
            loan.outstanding_balance = approved_amount
            loan.monthly_payment = calculate_monthly_payment(approved_amount, loan.interest_rate, loan.duration_months)
            loan.approved_at = now
            loan.disbursed_at = now
            loan.due_date = now + timedelta(days=30 * loan.duration_months)
            loan.admin_notes = data.response_message

            account.balance += approved_amount
            account.available_balance += approved_amount

            # Create disbursement transaction
            txn = Transaction(
                id=str(uuid.uuid4()),
                account_id=account.id,
                reference_id=str(uuid.uuid4()),
                transaction_type="loan_disbursement",
                amount=approved_amount,
                currency=account.currency,
                balance_after=account.balance,
                description=f"Loan disbursement - {loan.loan_number}",
                status="completed",
                initiated_by=admin.id,
                is_debit=False
            )
            db.add(txn)
            notif.status = "resolved"
            await _create_user_notification(db, notif.user_id, "loan_approved",
                "Loan Approved & Disbursed ✅",
                f"Congratulations! Your loan of {account.currency} {approved_amount:,.2f} (#{loan.loan_number}) has been approved and credited to your account.")
            result_message = f"Loan approved and {approved_amount:,.2f} disbursed"

        elif data.action == "reject" and loan:
            loan.status = "rejected"
            loan.rejection_reason = data.response_message
            notif.status = "resolved"
            await _create_user_notification(db, notif.user_id, "loan_rejected",
                "Loan Application Declined",
                f"Your loan application #{loan.loan_number} was declined. Reason: {data.response_message or 'Does not meet requirements'}")
            result_message = "Loan rejected"

    # ── LOAN REPAYMENT ────────────────────────────────────────────────────────
    elif notif.notification_type == "loan_repayment":
        meta = json.loads(notif.metadata_json) if notif.metadata_json else {}
        loan_result = await db.execute(select(Loan).where(Loan.id == meta.get("loan_id")))
        loan = loan_result.scalar_one_or_none()
        acc_result = await db.execute(select(Account).where(Account.id == meta.get("account_id")))
        account = acc_result.scalar_one_or_none()

        if data.action == "approve" and loan and account:
            amount = data.amount or float(meta.get("amount", 0))
            account.balance -= amount
            account.available_balance -= amount
            loan.amount_repaid += amount
            loan.outstanding_balance = max(0, loan.outstanding_balance - amount)
            if loan.outstanding_balance <= 0:
                loan.status = "completed"
                loan.completed_at = now

            txn = Transaction(
                id=str(uuid.uuid4()),
                account_id=account.id,
                reference_id=str(uuid.uuid4()),
                transaction_type="loan_repayment",
                amount=amount,
                currency=account.currency,
                balance_after=account.balance,
                description=f"Loan repayment - {loan.loan_number}",
                status="completed",
                initiated_by=notif.user_id,
                is_debit=True
            )
            db.add(txn)
            notif.status = "resolved"
            await _create_user_notification(db, notif.user_id, "repayment_processed",
                "Loan Repayment Processed ✅",
                f"Your repayment of {amount:,.2f} on loan #{loan.loan_number} has been processed. Outstanding: {loan.outstanding_balance:,.2f}")
            result_message = f"Repayment of {amount:,.2f} processed"

    # ── CARD ACTIVATION ───────────────────────────────────────────────────────
    elif notif.notification_type in ("card_request", "card_link_request"):
        meta = json.loads(notif.metadata_json) if notif.metadata_json else {}
        card_result = await db.execute(select(Card).where(Card.id == (meta.get("card_id") or notif.reference_id)))
        card = card_result.scalar_one_or_none()

        if data.action == "approve" and card:
            card.status = "active"
            card.is_active = True
            card.activated_at = now
            notif.status = "resolved"
            await _create_user_notification(db, notif.user_id, "card_activated",
                "Card Activated ✅",
                f"Your {card.card_network.upper()} card ending in {card.card_number_masked[-4:]} has been activated.")
            result_message = "Card activated"
        elif data.action == "reject" and card:
            card.status = "blocked"
            notif.status = "resolved"
            result_message = "Card request rejected"

    # ── KYC VERIFICATION ─────────────────────────────────────────────────────
    elif notif.notification_type == "kyc_submission":
        if notif.user_id:
            user_result = await db.execute(select(User).where(User.id == notif.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                if data.action == "approve":
                    user.kyc_status = "verified"
                    user.is_verified = True
                    notif.status = "resolved"
                    await _create_user_notification(db, notif.user_id, "kyc_verified",
                        "Identity Verified ✅",
                        "Your KYC verification is complete. You now have full access to all banking features.")
                    result_message = "KYC approved"
                elif data.action == "reject":
                    user.kyc_status = "rejected"
                    notif.status = "resolved"
                    await _create_user_notification(db, notif.user_id, "kyc_rejected",
                        "KYC Verification Failed",
                        f"KYC verification failed. Reason: {data.response_message or 'Documents unclear'}. Please resubmit.")
                    result_message = "KYC rejected"

    # ── GENERAL DISMISS/RESOLVE ───────────────────────────────────────────────
    elif data.action in ("resolve", "dismiss"):
        notif.status = "resolved" if data.action == "resolve" else "dismissed"
        result_message = f"Notification {data.action}d"

    await db.commit()

    # Notify user via websocket
    if notif.user_id:
        await ws_manager.notify_user(notif.user_id, {
            "type": "request_update",
            "notification_id": notif.id,
            "action": data.action,
            "message": data.response_message or result_message
        })

    return {"message": result_message, "action": data.action}


# ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

@router.get("/users")
async def get_all_users(
    limit: int = 50,
    offset: int = 0,
    search: str = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(User).where(User.is_admin == False)
    if search:
        query = query.where(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    enriched = []
    for u in users:
        # Get account count and balance
        acc_result = await db.execute(select(Account).where(Account.user_id == u.id))
        accounts = acc_result.scalars().all()
        total_balance = sum(a.balance for a in accounts)

        enriched.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "phone": u.phone,
            "kyc_status": u.kyc_status,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "preferred_currency": u.preferred_currency,
            "account_count": len(accounts),
            "total_balance": total_balance,
            "created_at": u.created_at.isoformat(),
            "last_login": u.last_login.isoformat() if u.last_login else None
        })
    return enriched


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    accounts = (await db.execute(select(Account).where(Account.user_id == user_id))).scalars().all()
    loans = (await db.execute(select(Loan).where(Loan.user_id == user_id))).scalars().all()
    cards = (await db.execute(select(Card).where(Card.user_id == user_id))).scalars().all()

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "address": user.address,
            "kyc_status": user.kyc_status,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "preferred_currency": user.preferred_currency,
            "created_at": user.created_at.isoformat()
        },
        "accounts": [{"id": a.id, "account_number": a.account_number, "type": a.account_type, "balance": a.balance, "currency": a.currency, "is_frozen": a.is_frozen} for a in accounts],
        "loans": [{"loan_number": l.loan_number, "amount": l.amount_requested, "status": l.status, "outstanding": l.outstanding_balance} for l in loans],
        "cards": [{"card_number": c.card_number_masked, "type": c.card_type, "status": c.status, "network": c.card_network} for c in cards]
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_verified is not None:
        user.is_verified = data.is_verified
    if data.kyc_status is not None:
        user.kyc_status = data.kyc_status

    await db.commit()
    return {"message": "User updated"}


# ─── ACCOUNT MANAGEMENT ───────────────────────────────────────────────────────

@router.post("/accounts/add-funds")
async def admin_add_funds(
    data: AdminAddFundsRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin directly credits an account"""
    acc_result = await db.execute(select(Account).where(Account.id == data.account_id))
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.balance += data.amount
    account.available_balance += data.amount

    txn = Transaction(
        id=str(uuid.uuid4()),
        account_id=account.id,
        reference_id=str(uuid.uuid4()),
        transaction_type="deposit",
        amount=data.amount,
        currency=account.currency,
        balance_after=account.balance,
        description=data.description,
        status="completed",
        initiated_by=admin.id,
        is_debit=False
    )
    db.add(txn)

    await _create_user_notification(db, account.user_id, "admin_credit",
        "Account Credited ✅",
        f"Admin has credited {account.currency} {data.amount:,.2f} to your account {account.account_number}. Note: {data.description}")

    await db.commit()
    return {"message": f"Added {data.amount:,.2f} to account", "new_balance": account.balance}


@router.post("/accounts/{account_id}/freeze")
async def toggle_account_freeze(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    acc_result = await db.execute(select(Account).where(Account.id == account_id))
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.is_frozen = not account.is_frozen
    await db.commit()
    status = "frozen" if account.is_frozen else "unfrozen"
    return {"message": f"Account {status}", "is_frozen": account.is_frozen}


# ─── SAVINGS TIER MANAGEMENT ─────────────────────────────────────────────────

@router.get("/savings-tiers")
async def get_savings_tiers_admin(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(SavingsTier).order_by(SavingsTier.sort_order))
    return result.scalars().all()


@router.put("/savings-tiers/{tier_id}")
async def update_savings_tier(
    tier_id: str,
    data: AdminSavingsTierUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    tier_result = await db.execute(select(SavingsTier).where(SavingsTier.id == tier_id))
    tier = tier_result.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=404, detail="Savings tier not found")

    update_data = data.model_dump(exclude_none=True)
    for k, v in update_data.items():
        setattr(tier, k, v)
    await db.commit()
    return {"message": "Savings tier updated"}


@router.post("/savings-tiers")
async def create_savings_tier(
    data: AdminSavingsTierUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    tier = SavingsTier(
        id=str(uuid.uuid4()),
        name=data.name or "New Tier",
        min_balance=data.min_balance or 0,
        max_balance=data.max_balance or 99999,
        daily_interest_rate=data.daily_interest_rate or 0.01,
        color=data.color or "#10b981",
        is_active=True
    )
    db.add(tier)
    await db.commit()
    return {"message": "Savings tier created", "id": tier.id}


# ─── TRANSACTION OVERVIEW ─────────────────────────────────────────────────────

@router.get("/transactions")
async def get_all_transactions(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(
        select(Transaction).order_by(Transaction.created_at.desc()).offset(offset).limit(limit)
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
            "status": t.status,
            "is_debit": t.is_debit,
            "created_at": t.created_at.isoformat()
        }
        for t in transactions
    ]


@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Monthly transaction analytics for charts"""
    from sqlalchemy import extract
    
    # Last 6 months transaction data
    months_data = []
    now = datetime.utcnow()
    
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_num = month_date.month
        year_num = month_date.year

        deposits = (await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.transaction_type == "deposit",
                Transaction.status == "completed",
                extract("month", Transaction.created_at) == month_num,
                extract("year", Transaction.created_at) == year_num
            )
        )).scalar()

        withdrawals = (await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.transaction_type == "withdrawal",
                Transaction.status == "completed",
                extract("month", Transaction.created_at) == month_num,
                extract("year", Transaction.created_at) == year_num
            )
        )).scalar()

        months_data.append({
            "month": month_date.strftime("%b %Y"),
            "deposits": round(float(deposits), 2),
            "withdrawals": round(float(withdrawals), 2)
        })

    # Transaction type distribution
    type_dist = []
    for txn_type in ["deposit", "withdrawal", "transfer_out", "loan_disbursement", "savings_interest"]:
        count = (await db.execute(
            select(func.count(Transaction.id)).where(Transaction.transaction_type == txn_type)
        )).scalar()
        type_dist.append({"type": txn_type.replace("_", " ").title(), "count": count})

    return {
        "monthly_data": months_data,
        "transaction_types": type_dist
    }


# ─── HELPER ───────────────────────────────────────────────────────────────────

async def _create_user_notification(db, user_id: str, notif_type: str, title: str, message: str):
    if not user_id:
        return
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        notification_type=notif_type,
        title=title,
        message=message,
        is_admin_notification=False,
        status="resolved",
        priority="normal"
    )
    db.add(notif)
    # Real-time push
    await ws_manager.notify_user(user_id, {
        "type": "notification",
        "title": title,
        "message": message,
        "notification_type": notif_type
    })
