import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.ingestion.scheduler import start_scheduler, stop_scheduler
from app.routers import events, history, intelligence, risk, scenarios, stories, system, ws

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("gci.main")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    loop = asyncio.get_event_loop()
    # Ingestion runs on a background thread scheduler; kick it off in a
    # worker thread so the first (synchronous, network-bound) cycle doesn't
    # block the app from starting to accept requests.
    await asyncio.to_thread(start_scheduler, loop)
    logger.info("Global Crisis Intelligence backend ready (demo_mode=%s)", settings.demo_mode)
    yield
    stop_scheduler()


app = FastAPI(
    title="Global Crisis Intelligence API",
    description="Real-time global crisis monitoring and intelligence backend.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(risk.router)
app.include_router(stories.router)
app.include_router(history.router)
app.include_router(scenarios.router)
app.include_router(intelligence.router)
app.include_router(system.router)
app.include_router(ws.router)


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "demo_mode": settings.demo_mode}
