"""
Banesco Bank - Main Application Entry Point
A full banking demo application for school presentation
"""

import asyncio
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request

from .database import engine, create_tables, get_db
from .routers import auth, users, accounts, transactions, savings, loans, admin, notifications, cards, currency
from .services.websocket_manager import ws_manager
from .services.interest_scheduler import start_interest_scheduler
from .config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_tables()
    await seed_admin()
    task = asyncio.create_task(start_interest_scheduler())
    yield
    # Shutdown
    task.cancel()


app = FastAPI(
    title="Banesco Bank API",
    description="Full Banking Demo Application",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(static_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_path, "assets")), name="assets")

# API Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(savings.router, prefix="/api/savings", tags=["Savings"])
app.include_router(loans.router, prefix="/api/loans", tags=["Loans"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(cards.router, prefix="/api/cards", tags=["Cards"])
app.include_router(currency.router, prefix="/api/currency", tags=["Currency"])


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.utcnow().isoformat()}))
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()}


# Serve React frontend for all non-API routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str, request: Request):
    static_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    index_path = os.path.join(static_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    # Fallback: serve embedded HTML
    return HTMLResponse(content=get_loading_html(), status_code=200)


def get_loading_html():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Banesco Bank - Loading...</title>
    <style>
        body { display: flex; align-items: center; justify-content: center; height: 100vh; 
               background: #0a1628; color: #fff; font-family: system-ui; flex-direction: column; gap: 16px; }
        .spinner { width: 48px; height: 48px; border: 3px solid #1e3a5f; 
                   border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        p { color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <h2>Banesco Bank</h2>
    <p>Please build the frontend first: cd frontend && npm install && npm run build</p>
</body>
</html>"""


async def seed_admin():
    """Create default admin user if not exists"""
    from .database import AsyncSessionLocal
    from .models.user import User
    from .services.auth_service import get_password_hash
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        admin = result.scalar_one_or_none()
        if not admin:
            admin_user = User(
                id=str(uuid.uuid4()),
                email=settings.ADMIN_EMAIL,
                full_name="Banesco Admin",
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                is_admin=True,
                is_active=True,
                is_verified=True,
                phone="+1-800-Banesco",
                created_at=datetime.utcnow()
            )
            db.add(admin_user)
            await db.commit()
            print(f"✅ Admin seeded: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
