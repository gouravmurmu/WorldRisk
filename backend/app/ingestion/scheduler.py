"""Background ingestion scheduler.

Runs ingestion cycles on a timer (interval configurable via env) and pushes
a lightweight "data refreshed" notification over WebSocket so the frontend
can re-fetch without a full page reload. Uses APScheduler's BackgroundScheduler
(thread-based) since SQLAlchemy's sync session is simplest to reason about
here; the WebSocket broadcast is bounced onto the main asyncio loop via
`run_coroutine_threadsafe`.
"""
from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings
from app.ingestion.pipeline import run_ingestion_cycle_sync
from app.services.websocket_service import manager

logger = logging.getLogger("gci.scheduler")

_scheduler = BackgroundScheduler()
_main_loop: asyncio.AbstractEventLoop | None = None


def _run_cycle_job() -> None:
    try:
        result = run_ingestion_cycle_sync()
        if _main_loop is not None:
            asyncio.run_coroutine_threadsafe(
                manager.broadcast({
                    "type": "DATA_REFRESHED",
                    "event_count": result.get("event_count"),
                    "mode": result.get("mode"),
                    "timestamp": result.get("timestamp"),
                }),
                _main_loop,
            )
    except Exception:
        logger.exception("Ingestion cycle failed")


def start_scheduler(loop: asyncio.AbstractEventLoop) -> None:
    global _main_loop
    _main_loop = loop
    settings = get_settings()

    # Run once immediately so the app has data on first boot, then on interval.
    _run_cycle_job()

    interval = settings.gdacs_poll_seconds if settings.demo_mode else min(
        settings.gdacs_poll_seconds, settings.gdelt_poll_seconds
    )
    _scheduler.add_job(_run_cycle_job, "interval", seconds=max(60, interval), id="ingestion_cycle")
    _scheduler.start()
    logger.info("Ingestion scheduler started, interval=%ss", interval)


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
