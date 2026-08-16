from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.event import CrisisEvent
from app.services import query_service

router = APIRouter(prefix="/api/history", tags=["history"])

TREND_FIELDS = {
    "global": "global_risk", "geopolitical": "geopolitical_risk",
    "natural_disaster": "natural_disaster_risk", "weather": "weather_risk",
    "cyber": "cyber_risk", "economic": "economic_risk",
    "infrastructure": "infrastructure_risk", "health": "health_risk",
    "humanitarian": "humanitarian_risk",
}


@router.get("")
def history_overview(days: int = Query(30, le=365), db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    events = db.query(CrisisEvent).filter(CrisisEvent.event_date >= since).all()

    by_day: dict[str, dict] = {}
    for e in events:
        day = e.event_date.date().isoformat()
        bucket = by_day.setdefault(day, {"date": day, "count": 0, "critical": 0, "risk_sum": 0.0})
        bucket["count"] += 1
        bucket["risk_sum"] += e.risk_score
        if e.risk_score >= 81:
            bucket["critical"] += 1

    series = sorted(by_day.values(), key=lambda b: b["date"])
    for b in series:
        b["avg_risk"] = round(b["risk_sum"] / b["count"], 1) if b["count"] else 0
        del b["risk_sum"]

    top_events = sorted(events, key=lambda e: e.risk_score, reverse=True)[:10]

    country_counts: dict[str, int] = {}
    for e in events:
        if e.country:
            country_counts[e.country] = country_counts.get(e.country, 0) + 1

    return {
        "days": days,
        "daily_series": series,
        "total_events": len(events),
        "top_events": [
            {"id": e.id, "title": e.title, "risk_score": e.risk_score, "country": e.country}
            for e in top_events
        ],
        "country_heatmap": [{"country": c, "count": n} for c, n in
                             sorted(country_counts.items(), key=lambda kv: kv[1], reverse=True)[:20]],
    }


@router.get("/trends")
def history_trends(
    metric: str = Query("global", pattern="^(global|geopolitical|natural_disaster|weather|cyber|economic|infrastructure|health|humanitarian)$"),
    days: int = Query(90, le=365),
    region: str | None = None,
    country: str | None = None,
    db: Session = Depends(get_db),
):
    field = TREND_FIELDS[metric]
    return query_service.historical_trend(db, category_key=field, days=days, region=region, country=country)
