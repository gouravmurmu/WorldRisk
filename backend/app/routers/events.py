from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.event import EventListItem, EventOut, EventRelationshipOut, EventSourceOut
from app.services import query_service, risk_service

router = APIRouter(prefix="/api/events", tags=["events"])


def _to_event_out(e) -> EventOut:
    return EventOut(
        **{k: getattr(e, k) for k in [
            "id", "source", "event_type", "event_category", "title", "summary",
            "latitude", "longitude", "radius_km", "country", "country_code", "region",
            "continent", "admin1", "severity", "risk_score", "confidence_score",
            "risk_components", "event_date", "detected_at", "updated_at",
            "population_exposure", "economic_exposure", "geographic_spread",
            "escalation_score", "has_fatalities", "fatalities", "status", "trend", "source_url",
            "metrics", "timeline", "article",
        ]},
        severity_level=risk_service.severity_level(e.risk_score).value,
    )


@router.get("", response_model=list[EventListItem])
def list_events(
    category: str | None = None,
    severity: str | None = None,
    region: str | None = None,
    country: str | None = None,
    status: str | None = None,
    time_range: str = Query("30d", pattern="^(24h|7d|30d|90d|all)$"),
    search: str | None = None,
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
):
    since = None
    if time_range != "all":
        hours = {"24h": 24, "7d": 24 * 7, "30d": 24 * 30, "90d": 24 * 90}[time_range]
        since = datetime.now(timezone.utc) - timedelta(hours=hours)

    rows = query_service.list_events(
        db, category=category, severity_level=severity, region=region,
        country_code=country, since=since, status=status, search=search, limit=limit,
    )
    return [
        EventListItem(
            id=e.id, event_category=e.event_category, event_type=e.event_type,
            title=e.title, country=e.country, region=e.region,
            latitude=e.latitude, longitude=e.longitude, severity=e.severity,
            risk_score=e.risk_score, severity_level=risk_service.severity_level(e.risk_score).value,
            trend=e.trend, status=e.status, event_date=e.event_date,
        )
        for e in rows
    ]


@router.get("/map", response_model=list[EventListItem])
def events_for_map(
    category: str | None = None,
    severity: str | None = None,
    time_range: str = Query("30d", pattern="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
):
    return list_events(category=category, severity=severity, region=None, country=None,
                        status=None, time_range=time_range, search=None, limit=2000, db=db)


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    ev = query_service.get_event(db, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    return _to_event_out(ev)


@router.get("/{event_id}/sources", response_model=list[EventSourceOut])
def get_event_sources(event_id: str, db: Session = Depends(get_db)):
    ev = query_service.get_event(db, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    return list(ev.sources)


@router.get("/{event_id}/relationships", response_model=list[EventRelationshipOut])
def get_event_relationships(event_id: str, db: Session = Depends(get_db)):
    ev = query_service.get_event(db, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    return query_service.get_relationships_for_event(db, event_id)
