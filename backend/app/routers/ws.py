from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_service import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Frontend doesn't need to send anything; keep the socket open
            # and drain any client pings so the connection stays alive.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
