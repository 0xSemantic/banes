"""
Credex Bank - Cards Router
Virtual card requests, external card linking
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
from ..models.card import Card
from ..models.notification import Notification
from ..schemas import RequestVirtualCardRequest, LinkExternalCardRequest
from ..services.auth_service import get_current_user
from ..utils import generate_card_number_masked

router = APIRouter()


@router.get("/")
async def get_my_cards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Card).where(Card.user_id == current_user.id).order_by(Card.created_at.desc())
    )
    cards = result.scalars().all()
    return [_card_to_dict(c) for c in cards]


@router.post("/request-virtual")
async def request_virtual_card(
    data: RequestVirtualCardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    acc_result = await db.execute(
        select(Account).where(Account.id == data.account_id, Account.user_id == current_user.id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    now = datetime.utcnow()
    expiry_date = now + timedelta(days=365 * 3)

    card = Card(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        account_id=account.id,
        card_type="virtual",
        card_network=data.card_network,
        card_number_masked=generate_card_number_masked(),
        card_holder_name=current_user.full_name.upper(),
        expiry_month=str(expiry_date.month).zfill(2),
        expiry_year=str(expiry_date.year),
        is_external=False,
        status="pending",
        color_theme=data.color_theme,
        created_at=now
    )
    db.add(card)

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="card_request",
        title="Virtual Card Request",
        message=f"{current_user.full_name} requested a {data.card_network.upper()} virtual card for account {account.account_number}.",
        reference_type="card",
        reference_id=card.id,
        is_admin_notification=True,
        status="pending",
        priority="normal",
        metadata_json=json.dumps({
            "card_id": card.id,
            "card_type": "virtual",
            "card_network": data.card_network,
            "account_id": account.id
        })
    )
    db.add(notif)
    await db.commit()

    return {"message": "Virtual card request submitted. Admin will activate shortly.", "card_id": card.id}


@router.post("/link-external")
async def link_external_card(
    data: LinkExternalCardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    acc_result = await db.execute(
        select(Account).where(Account.id == data.account_id, Account.user_id == current_user.id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    card = Card(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        account_id=account.id,
        card_type="linked_external",
        card_network=data.card_network,
        card_number_masked=f"**** **** **** {data.card_number_last4}",
        card_holder_name=data.card_holder_name.upper(),
        expiry_month=data.expiry_month,
        expiry_year=data.expiry_year,
        bank_name=data.bank_name,
        is_external=True,
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(card)

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        notification_type="card_link_request",
        title="External Card Link Request",
        message=f"{current_user.full_name} wants to link a {data.card_network.upper()} card ending in {data.card_number_last4} from {data.bank_name}.",
        reference_type="card",
        reference_id=card.id,
        is_admin_notification=True,
        status="pending",
        priority="normal"
    )
    db.add(notif)
    await db.commit()

    return {"message": "Card link request submitted. Admin will verify and activate."}


@router.post("/{card_id}/freeze")
async def freeze_card(
    card_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.user_id == current_user.id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    card.is_frozen = not card.is_frozen
    await db.commit()
    action = "frozen" if card.is_frozen else "unfrozen"
    return {"message": f"Card {action} successfully", "is_frozen": card.is_frozen}


def _card_to_dict(c: Card) -> dict:
    return {
        "id": c.id,
        "user_id": c.user_id,
        "account_id": c.account_id,
        "card_type": c.card_type,
        "card_network": c.card_network,
        "card_number_masked": c.card_number_masked,
        "card_holder_name": c.card_holder_name,
        "expiry_month": c.expiry_month,
        "expiry_year": c.expiry_year,
        "bank_name": c.bank_name,
        "is_external": c.is_external,
        "is_active": c.is_active,
        "is_frozen": c.is_frozen,
        "is_default": c.is_default,
        "daily_limit": c.daily_limit,
        "online_transactions": c.online_transactions,
        "international_transactions": c.international_transactions,
        "contactless": c.contactless,
        "status": c.status,
        "color_theme": c.color_theme,
        "created_at": c.created_at.isoformat()
    }
