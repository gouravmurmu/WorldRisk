"""Minimal WebSocket connection manager / fan-out hub.

FastAPI's own WebSocket support is sufficient at this scale (single
process); this class just tracks live connections and broadcasts JSON
messages so the ingestion scheduler doesn't need to know about connection
lifecycle.
"""
from __future__ import annotations

import json
import logging

from fastapi import WebSocket

logger = logging.getLogger("gci.ws")


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict) -> None:
        dead: list[WebSocket] = []
        payload = json.dumps(message, default=str)
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
