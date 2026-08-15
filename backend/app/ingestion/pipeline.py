"""Orchestrates one ingestion cycle: fetch -> normalize -> score -> persist.

Runs on a scheduled interval (see ingestion/scheduler.py) so the browser
never hits GDACS/GDELT directly. In DEMO_MODE, or when both live providers
return nothing (missing key, network failure), falls back to the
deterministic demo dataset so the dashboard is never empty.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from geoalchemy2 import WKTElement
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models.event import CrisisEvent, EventRelationship, EventSource
from app.models.risk import RiskSnapshot
from app.services import demo_provider, risk_service
from app.services.gdacs_service import gdacs_provider
from app.services.gdelt_service import gdelt_provider
from app.services.normalization_service import NormalizedEvent
from app.services.relationship_service import compute_relationships
from app.taxonomy import REGIONS

logger = logging.getLogger("gci.ingestion")

_last_run: dict = {"timestamp": None, "event_count": 0, "source_breakdown": {}}


async def fetch_all_events() -> tuple[list[NormalizedEvent], str]:
    settings = get_settings()
    if settings.demo_mode:
        return demo_provider.generate_events(), "DEMO"

    gdacs_events = await gdacs_provider.fetch_events()
    gdelt_events = await gdelt_provider.fetch_events()
    combined = gdacs_events + gdelt_events
    if not combined:
        logger.warning("Live providers returned no events — falling back to demo dataset")
        return demo_provider.generate_events(), "DEMO_FALLBACK"
    return combined, "LIVE"


def _persist_event(db: Session, ev: NormalizedEvent) -> CrisisEvent:
    region_info = ev.with_region()
    existing = (
        db.query(CrisisEvent)
        .filter(CrisisEvent.source == ev.source, CrisisEvent.source_event_id == ev.source_event_id)
        .one_or_none()
    )

    estimated_fields = []
    if not ev.sources:
        estimated_fields.append("confidence")

    components = risk_service.score_components(
        severity=ev.severity_raw,
        population_exposure=ev.population_exposure,
        economic_exposure=ev.economic_exposure,
        escalation=ev.escalation_score,
        geographic_spread=ev.geographic_spread,
        confidence=ev.confidence_score,
        event_date=ev.event_date or datetime.now(timezone.utc),
        estimated_fields=estimated_fields,
    )
    risk_score = risk_service.compute_score(components)

    row = existing or CrisisEvent(source=ev.source, source_event_id=ev.source_event_id)
    row.event_type = ev.event_type
    row.event_category = ev.event_category.value
    row.title = ev.title
    row.summary = ev.summary
    row.latitude = ev.latitude
    row.longitude = ev.longitude
    row.geom = WKTElement(f"POINT({ev.longitude} {ev.latitude})", srid=4326)
    row.radius_km = ev.radius_km
    row.country = region_info["country"]
    row.country_code = ev.country_code
    row.region = region_info["region"]
    row.continent = region_info["continent"]
    row.admin1 = ev.admin1
    row.severity = ev.severity_raw
    row.risk_score = risk_score
    row.confidence_score = ev.confidence_score
    row.risk_components = components
    row.event_date = ev.event_date or datetime.now(timezone.utc)
    row.population_exposure = ev.population_exposure
    row.economic_exposure = ev.economic_exposure
    row.geographic_spread = ev.geographic_spread
    row.escalation_score = ev.escalation_score
    row.has_fatalities = ev.has_fatalities
    row.fatalities = ev.fatalities
    row.status = ev.status
    row.trend = ev.trend
    row.source_url = ev.source_url
    row.updated_at = datetime.now(timezone.utc)

    db.add(row)
    db.flush()  # ensure row.id is populated for source rows

    if not existing:
        for src in ev.sources:
            db.add(EventSource(
                event_id=row.id, provider=src.provider, source_url=src.source_url,
                title=src.title, publisher=src.publisher, published_at=src.published_at,
                source_type=src.source_type, credibility_score=src.credibility_score,
            ))
    return row


def _write_snapshots(db: Session, events: list[CrisisEvent]) -> None:
    now = datetime.now(timezone.utc)
    global_snap = risk_service.global_risk_snapshot(events, now)
    db.add(RiskSnapshot(timestamp=now, **global_snap))

    for region in REGIONS:
        score = risk_service.regional_risk(events, region, now)
        db.add(RiskSnapshot(timestamp=now, global_risk=score, region=region))

    countries = {e.country_code for e in events if e.country_code}
    for cc in countries:
        breakdown = risk_service.country_risk_breakdown(events, cc, now)
        db.add(RiskSnapshot(timestamp=now, global_risk=breakdown["national_risk"], country=cc))


def run_ingestion_cycle_sync() -> dict:
    import asyncio

    normalized, mode = asyncio.run(fetch_all_events())
    db = SessionLocal()
    try:
        rows = [_persist_event(db, ev) for ev in normalized]
        db.flush()

        db.query(EventRelationship).delete()
        relationships = compute_relationships(rows)
        for rel in relationships:
            db.add(EventRelationship(**rel))

        _write_snapshots(db, rows)
        db.commit()

        breakdown: dict[str, int] = {}
        for r in rows:
            breakdown[r.source] = breakdown.get(r.source, 0) + 1

        _last_run.update({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_count": len(rows),
            "relationship_count": len(relationships),
            "mode": mode,
            "source_breakdown": breakdown,
        })
        logger.info("Ingestion cycle complete: %s events (%s), %s relationships", len(rows), mode, len(relationships))
        return _last_run
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def last_run_info() -> dict:
    return _last_run
