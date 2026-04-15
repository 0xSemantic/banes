"""
Chat Router – Customer Support
Real-time messaging between users and admin via WebSocket.
"""
import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..database import get_db
from ..models.user import User
from ..models.chat import ChatSession, ChatMessage
from ..schemas import ChatMessageCreate, ChatMessageOut, ChatSessionOut
from ..services.auth_service import get_current_user, get_current_admin, decode_token

router = APIRouter(tags=["chat"])

# In-memory store: { session_id: { user_id: websocket } }
active_connections = {}


# ------------------ Helper ------------------
async def _is_participant_or_admin(session: ChatSession, user_id: str, db: AsyncSession) -> bool:
    """Check if user is session owner, assigned admin, or any admin."""
    if session.user_id == user_id or session.admin_id == user_id:
        return True
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return user is not None and user.is_admin


# ------------------ User endpoints ------------------
@router.get("/sessions", response_model=List[ChatSessionOut])
async def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/sessions", response_model=ChatSessionOut)
async def create_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = ChatSession(user_id=current_user.id, status="open")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
async def get_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await db.get(ChatSession, session_id)
    if not session or not await _is_participant_or_admin(session, current_user.id, db):
        raise HTTPException(status_code=403, detail="Not participant")

    result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp)
    )
    messages = result.scalars().all()

    for msg in messages:
        if msg.sender_id != current_user.id and not msg.is_read:
            msg.is_read = True
    await db.commit()
    return messages


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageOut)
async def send_message(
    session_id: int,
    msg_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await db.get(ChatSession, session_id)
    if not session or not await _is_participant_or_admin(session, current_user.id, db):
        raise HTTPException(status_code=403, detail="Not participant")
    if session.status == "closed":
        raise HTTPException(status_code=400, detail="Session closed")

    if session.admin_id is None and current_user.id == session.user_id:
        admin_result = await db.execute(select(User).where(User.is_admin == True).limit(1))
        admin = admin_result.scalar_one_or_none()
        if admin:
            session.admin_id = admin.id
            await db.commit()

    message = ChatMessage(
        session_id=session_id,
        sender_id=current_user.id,
        content=msg_data.content
    )
    db.add(message)
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(message)

    other_id = session.user_id if current_user.id == session.admin_id else session.admin_id
    if other_id and session_id in active_connections and other_id in active_connections[session_id]:
        ws = active_connections[session_id][other_id]
        await ws.send_text(json.dumps({
            "type": "new_message",
            "message": {
                "id": message.id,
                "sender_id": message.sender_id,
                "content": message.content,
                "timestamp": message.timestamp.isoformat()
            }
        }))

    return message


@router.put("/sessions/{session_id}/close")
async def close_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await db.get(ChatSession, session_id)
    if not session or not await _is_participant_or_admin(session, current_user.id, db):
        raise HTTPException(status_code=403, detail="Not participant")
    session.status = "closed"
    await db.commit()
    return {"message": "Session closed"}


# ------------------ Admin endpoints ------------------
@router.get("/admin/sessions")
async def get_all_sessions(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Load sessions with user relationship
    result = await db.execute(
        select(ChatSession)
        .options(joinedload(ChatSession.user))
        .order_by(ChatSession.status.desc(), ChatSession.updated_at.desc())
    )
    sessions = result.unique().scalars().all()
    
    response = []
    for s in sessions:
        user_info = None
        if s.user:
            user_info = {
                "id": s.user.id,
                "full_name": s.user.full_name,
                "email": s.user.email
            }
        response.append({
            "id": s.id,
            "user_id": s.user_id,
            "admin_id": s.admin_id,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
            "user": user_info
        })
    # Debug print (check server console)
    print(f"Admin sessions response: {response[0] if response else 'empty'}")
    return response


@router.post("/admin/sessions/{session_id}/assign")
async def assign_admin(
    session_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    session = await db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404)
    session.admin_id = current_admin.id
    await db.commit()
    return {"message": "Admin assigned"}


# ------------------ WebSocket endpoint ------------------
async def websocket_chat_endpoint(
    websocket: WebSocket,
    session_id: int,
    token: str,
    db: AsyncSession
):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008)
        return
    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=1008)
        return

    user_result = await db.execute(select(User).where(User.id == user_id))
    user_obj = user_result.scalar_one_or_none()
    if not user_obj:
        await websocket.close(code=1008)
        return

    session = await db.get(ChatSession, session_id)
    if not session:
        await websocket.close(code=1003)
        return

    is_admin = user_obj.is_admin

    if session.user_id == user_id or session.admin_id == user_id or is_admin:
        if is_admin and session.admin_id is None:
            session.admin_id = user_id
            await db.commit()
    else:
        await websocket.close(code=1003)
        return

    if session_id not in active_connections:
        active_connections[session_id] = {}
    active_connections[session_id][user_id] = websocket
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            new_msg = ChatMessage(
                session_id=session_id,
                sender_id=user_id,
                content=msg_data["content"]
            )
            db.add(new_msg)
            session.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(new_msg)

            other_id = session.user_id if user_id == session.admin_id else session.admin_id
            if other_id and other_id in active_connections.get(session_id, {}):
                other_ws = active_connections[session_id][other_id]
                await other_ws.send_text(json.dumps({
                    "type": "new_message",
                    "message": {
                        "id": new_msg.id,
                        "sender_id": new_msg.sender_id,
                        "content": new_msg.content,
                        "timestamp": new_msg.timestamp.isoformat()
                    }
                }))
            await websocket.send_text(json.dumps({"type": "sent", "id": new_msg.id}))
    except WebSocketDisconnect:
        if session_id in active_connections and user_id in active_connections[session_id]:
            del active_connections[session_id][user_id]
            if not active_connections[session_id]:
                del active_connections[session_id]