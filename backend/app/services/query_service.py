"""Shared read-query helpers.

Both the REST routers and the AI intelligence_service tools call into this
module, so the AI never has a different view of the data than the
dashboard — it can't "see" anything the API doesn't also expose.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.event import CrisisEvent, EventRelationship, EventSource
from app.models.risk import RiskSnapshot
from app.services import risk_service
from app.taxonomy import REGIONS


def list_events(
    db: Session,
    category: str | None = None,
    severity_level: str | None = None,
    region: str | None = None,
    country_code: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = 500,
) -> list[CrisisEvent]:
    q = db.query(CrisisEvent)
    if category:
        q = q.filter(CrisisEvent.event_category == category)
    if region:
        q = q.filter(CrisisEvent.region == region)
    if country_code:
        q = q.filter(CrisisEvent.country_code == country_code)
    if status:
        q = q.filter(CrisisEvent.status == status)
    if since:
        q = q.filter(CrisisEvent.event_date >= since)
    if until:
        q = q.filter(CrisisEvent.event_date <= until)
    if search:
        like = f"%{search}%"
        q = q.filter((CrisisEvent.title.ilike(like)) | (CrisisEvent.country.ilike(like)))

    rows = q.order_by(CrisisEvent.risk_score.desc()).limit(2000).all()

    if severity_level:
        rows = [r for r in rows if risk_service.severity_level(r.risk_score).value == severity_level]

    return rows[:limit]


def get_event(db: Session, event_id: str) -> CrisisEvent | None:
    return db.query(CrisisEvent).filter(CrisisEvent.id == event_id).one_or_none()


def get_relationships_for_event(db: Session, event_id: str) -> list[dict]:
    rels = (
        db.query(EventRelationship)
        .filter(
            (EventRelationship.source_event_id == event_id)
            | (EventRelationship.target_event_id == event_id)
        )
        .order_by(EventRelationship.strength.desc())
        .all()
    )
    out = []
    for rel in rels:
        other_id = rel.target_event_id if rel.source_event_id == event_id else rel.source_event_id
        other = get_event(db, other_id)
        out.append({
            "id": rel.id,
            "source_event_id": rel.source_event_id,
            "target_event_id": rel.target_event_id,
            "relationship_type": rel.relationship_type,
            "evidence": rel.evidence,
            "reason": rel.reason,
            "strength": rel.strength,
            "confidence": rel.confidence,
            "other_event_title": other.title if other else "",
            "other_event_category": other.event_category if other else "",
        })
    return out


def all_active_events(db: Session) -> list[CrisisEvent]:
    return db.query(CrisisEvent).all()


def global_risk(db: Session) -> dict:
    events = all_active_events(db)
    snapshot = risk_service.global_risk_snapshot(events)
    active = [e for e in events if e.status != "RESOLVED"]
    return {
        **snapshot,
        "severity_level": risk_service.severity_level(snapshot["global_risk"]).value,
        "active_events": len(active),
        "high_severity_events": len([e for e in active if e.risk_score >= 61]),
        "escalating_events": len([e for e in active if e.trend == "ESCALATING"]),
        "affected_countries": len({e.country_code for e in active if e.country_code}),
        "timestamp": datetime.now(timezone.utc),
    }


def regional_risk_table(db: Session) -> list[dict]:
    events = all_active_events(db)
    out = []
    for region in REGIONS:
        subset = [e for e in events if e.region == region and e.status != "RESOLVED"]
        score = risk_service.regional_risk(events, region)
        top_category = ""
        if subset:
            counts: dict[str, int] = {}
            for e in subset:
                counts[e.event_category] = counts.get(e.event_category, 0) + 1
            top_category = max(counts, key=counts.get)
        out.append({
            "region": region,
            "risk_score": score,
            "severity_level": risk_service.severity_level(score).value,
            "active_events": len(subset),
            "top_category": top_category,
        })
    return sorted(out, key=lambda r: r["risk_score"], reverse=True)


def country_risk(db: Session, country_code: str) -> dict | None:
    events = all_active_events(db)
    subset = [e for e in events if e.country_code == country_code.upper()]
    if not subset:
        return None
    breakdown = risk_service.country_risk_breakdown(events, country_code.upper())
    return {
        "country": subset[0].country,
        "country_code": country_code.upper(),
        "severity_level": risk_service.severity_level(breakdown["national_risk"]).value,
        **breakdown,
    }


def list_countries(db: Session) -> list[dict]:
    events = all_active_events(db)
    codes = {e.country_code: e.country for e in events if e.country_code}
    out = []
    for code, name in codes.items():
        breakdown = risk_service.country_risk_breakdown(events, code)
        active = [e for e in events if e.country_code == code and e.status != "RESOLVED"]

        top_category = ""
        if active:
            counts: dict[str, int] = {}
            for e in active:
                counts[e.event_category] = counts.get(e.event_category, 0) + 1
            top_category = max(counts, key=counts.get)

        out.append({
            "country": name,
            "country_code": code,
            "national_risk": breakdown["national_risk"],
            "severity_level": risk_service.severity_level(breakdown["national_risk"]).value,
            "active_events": breakdown["active_events"],
            "top_category": top_category,
            "escalating_count": len([e for e in active if e.trend == "ESCALATING"]),
        })
    return sorted(out, key=lambda c: c["national_risk"], reverse=True)


def top_developments(db: Session, limit: int = 6) -> list[dict]:
    events = [e for e in all_active_events(db) if e.status != "RESOLVED"]
    events.sort(key=lambda e: e.risk_score, reverse=True)
    out = []
    for e in events[:limit]:
        # % change proxy: escalation vs baseline 50, clipped for display
        pct = round((e.escalation_score - 50) / 50 * 100, 0)
        out.append({
            "id": e.id,
            "title": e.title,
            "country": e.country,
            "risk_score": e.risk_score,
            "trend": e.trend,
            "pct_change": pct,
        })
    return out


def historical_trend(
    db: Session,
    category_key: str = "global_risk",
    days: int = 90,
    region: str | None = None,
    country: str | None = None,
) -> list[dict]:
    """Global scope supports every per-category metric (geopolitical_risk,
    weather_risk, etc). Region/country-scoped snapshots only ever carry the
    single aggregate score (see ingestion/pipeline._write_snapshots), so a
    scoped request always returns `global_risk` regardless of category_key.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    q = db.query(RiskSnapshot).filter(RiskSnapshot.timestamp >= since)

    if region:
        q = q.filter(RiskSnapshot.region == region, RiskSnapshot.country == "")
        field = "global_risk"
    elif country:
        q = q.filter(RiskSnapshot.country == country.upper(), RiskSnapshot.region == "")
        field = "global_risk"
    else:
        q = q.filter(RiskSnapshot.region == "", RiskSnapshot.country == "")
        field = category_key if hasattr(RiskSnapshot, category_key) else "global_risk"

    rows = q.order_by(RiskSnapshot.timestamp.asc()).all()
    return [{"timestamp": r.timestamp, "value": getattr(r, field)} for r in rows]


def recent_stories(db: Session, category: str | None = None, region: str | None = None, limit: int = 20) -> list[dict]:
    """Stories are event+evidence bundles derived from persisted events and
    their sources — kept distinct in the UI from a verified `EventOut`."""
    q = db.query(CrisisEvent)
    if category:
        q = q.filter(CrisisEvent.event_category == category)
    if region:
        q = q.filter(CrisisEvent.region == region)
    events = q.order_by(CrisisEvent.risk_score.desc()).limit(limit).all()

    stories = []
    for e in events:
        sources = db.query(EventSource).filter(EventSource.event_id == e.id).all()
        stories.append({
            "id": f"story-{e.id}",
            "title": f"Coverage: {e.title}",
            "summary": e.summary,
            "category": e.event_category,
            "country": e.country,
            "region": e.region,
            "significance": e.risk_score,
            "published_at": e.event_date,
            "article_count": len(sources),
            "articles": [
                {
                    "title": s.title,
                    "publisher": s.publisher,
                    "url": s.source_url,
                    "published_at": s.published_at,
                }
                for s in sources
            ],
        })
    return stories
