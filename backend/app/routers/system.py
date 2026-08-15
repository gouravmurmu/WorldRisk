from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.ingestion.pipeline import last_run_info
from app.services.gdacs_service import gdacs_provider
from app.services.gdelt_service import gdelt_provider
from app.services.websocket_service import manager

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/status")
def system_status(db: Session = Depends(get_db)):
    settings = get_settings()
    db_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_healthy = False

    run_info = last_run_info()

    return {
        "demo_mode": settings.demo_mode,
        "ingestion": run_info,
        "sources": {
            "gdacs": gdacs_provider.health(),
            "gdelt": gdelt_provider.health(),
        },
        "database": {"status": "HEALTHY" if db_healthy else "DOWN"},
        "ai_engine": {"status": "READY" if settings.llm_api_key else "DEMO_ONLY"},
        "websocket": {"status": "CONNECTED", "active_connections": len(manager.active)},
    }
