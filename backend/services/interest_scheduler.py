"""
Credex Bank - Interest Scheduler
Automatically applies daily savings interest
Runs as background asyncio task - no Redis needed
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy import select
from ..database import AsyncSessionLocal
from ..models.savings import SavingsPlan
from ..models.account import Account
from ..models.transaction import Transaction
from ..models.settings_model import SavingsTier


async def apply_daily_interest():
    """Apply interest to all active savings plans"""
    async with AsyncSessionLocal() as db:
        # Get all active savings plans
        result = await db.execute(
            select(SavingsPlan).where(SavingsPlan.is_active == True)
        )
        plans = result.scalars().all()
        
        now = datetime.utcnow()
        processed = 0
        
        for plan in plans:
            # Check if interest was already applied today
            if plan.last_interest_applied:
                last = plan.last_interest_applied
                if last.date() >= now.date():
                    continue  # Already done today
            
            # Get account
            acc_result = await db.execute(select(Account).where(Account.id == plan.account_id))
            account = acc_result.scalar_one_or_none()
            if not account or not account.is_active or account.is_frozen:
                continue
            
            # Get current tier based on balance
            tier_result = await db.execute(
                select(SavingsTier).where(
                    SavingsTier.is_active == True,
                    SavingsTier.min_balance <= account.balance,
                    SavingsTier.max_balance >= account.balance
                ).order_by(SavingsTier.min_balance.desc())
            )
            tier = tier_result.scalar_one_or_none()
            
            rate = tier.daily_interest_rate if tier else plan.daily_interest_rate
            interest = round(account.balance * (rate / 100), 4)
            
            if interest <= 0:
                continue
            
            # Update account balance
            account.balance += interest
            account.available_balance += interest
            
            # Update savings plan
            plan.total_interest_earned += interest
            plan.principal = account.balance
            plan.last_interest_applied = now
            if tier:
                plan.tier_name = tier.name
                plan.daily_interest_rate = tier.daily_interest_rate
            
            # Create transaction record
            txn = Transaction(
                id=str(uuid.uuid4()),
                account_id=account.id,
                reference_id=str(uuid.uuid4()),
                transaction_type="savings_interest",
                amount=interest,
                currency=account.currency,
                balance_after=account.balance,
                description=f"Daily savings interest ({rate}% rate) - {plan.tier_name}",
                status="completed",
                initiated_by="system",
                is_debit=False
            )
            db.add(txn)
            processed += 1
        
        if processed > 0:
            await db.commit()
            print(f"✅ Interest applied to {processed} savings plans at {now.strftime('%Y-%m-%d %H:%M')}")


async def start_interest_scheduler():
    """Run interest scheduler forever - checks every hour"""
    print("🕐 Interest scheduler started")
    while True:
        try:
            now = datetime.utcnow()
            # Apply interest once per day around midnight UTC
            if now.hour == 0 and now.minute < 5:
                await apply_daily_interest()
            # For demo: also apply every 24h cycle based on last_interest_applied
            await check_overdue_interest()
        except Exception as e:
            print(f"❌ Scheduler error: {e}")
        
        await asyncio.sleep(300)  # Check every 5 minutes


async def check_overdue_interest():
    """Apply interest for any plan that hasn't received it in 24h"""
    async with AsyncSessionLocal() as db:
        yesterday = datetime.utcnow() - timedelta(hours=24)
        result = await db.execute(
            select(SavingsPlan).where(
                SavingsPlan.is_active == True,
                (SavingsPlan.last_interest_applied == None) | 
                (SavingsPlan.last_interest_applied <= yesterday)
            )
        )
        plans = result.scalars().all()
        
        if plans:
            await apply_daily_interest()
