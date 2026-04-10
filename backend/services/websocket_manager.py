"""
Credex Bank - WebSocket Manager
Real-time notifications without Redis - in-memory connection tracking
"""
import json
from datetime import datetime
from typing import Dict
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        await self.send_to_client(client_id, {
            "type": "connected",
            "message": "Real-time connection established",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)
    
    async def send_to_client(self, client_id: str, data: dict):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(json.dumps(data))
            except Exception:
                self.disconnect(client_id)
    
    async def broadcast_to_admins(self, data: dict):
        """Broadcast to all admin connections"""
        for client_id, ws in list(self.active_connections.items()):
            if client_id.startswith("admin:"):
                try:
                    await ws.send_text(json.dumps(data))
                except Exception:
                    self.disconnect(client_id)
    
    async def broadcast_all(self, data: dict):
        for client_id, ws in list(self.active_connections.items()):
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect(client_id)
    
    async def notify_user(self, user_id: str, notification: dict):
        """Send notification to specific user"""
        await self.send_to_client(f"user:{user_id}", {
            "type": "notification",
            "data": notification,
            "timestamp": datetime.utcnow().isoformat()
        })
        # Also notify admins
        await self.broadcast_to_admins({
            "type": "new_request",
            "data": notification,
            "timestamp": datetime.utcnow().isoformat()
        })


ws_manager = WebSocketManager()
