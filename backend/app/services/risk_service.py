"""Deterministic, explainable risk engine.

Every event gets a 0-100 risk score built from named, normalized components.
The engine is intentionally simple linear weighting rather than a trained
model — see README "Architecture Decisions" for why, and how a trained
model could later replace `score_event` without touching call sites.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.models.event import CrisisEvent
from app.taxonomy import EventCategory, SeverityLevel, classify_risk

WEIGHTS = {
    "severity": 0.25,
    "population_exposure": 0.20,
    "economic_exposure": 0.15,
    "escalation": 0.15,
    "geographic_spread": 0.10,
    "confidence": 0.10,
    "recency": 0.05,
}


def recency_score(event_date: datetime, now: datetime | None = None) -> float:
    now = now or datetime.now(timezone.utc)
    if event_date.tzinfo is None:
        event_date = event_date.replace(tzinfo=timezone.utc)
    age_hours = max(0.0, (now - event_date).total_seconds() / 3600)
    # 100 at 0h, ~50 at 72h, asymptotic decay — recent events dominate without
    # a hard cliff.
    return max(0.0, 100.0 * (0.5 ** (age_hours / 72)))


def score_components(
    severity: float,
    population_exposure: float,
    economic_exposure: float,
    escalation: float,
    geographic_spread: float,
    confidence: float,
    event_date: datetime,
    estimated_fields: list[str] | None = None,
) -> dict:
    components = {
        "severity": round(severity, 1),
        "population_exposure": round(population_exposure, 1),
        "economic_exposure": round(economic_exposure, 1),
        "escalation": round(escalation, 1),
        "geographic_spread": round(geographic_spread, 1),
        "confidence": round(confidence, 1),
        "recency": round(recency_score(event_date), 1),
    }
    estimated_fields = estimated_fields or []
    components["partially_estimated"] = len(estimated_fields) > 0
    components["estimated_fields"] = estimated_fields
    return components


def compute_score(components: dict) -> float:
    total = sum(WEIGHTS[key] * components[key] for key in WEIGHTS)
    return round(max(0.0, min(100.0, total)), 1)


def severity_level(score: float) -> SeverityLevel:
    return classify_risk(score)


# ---------------------------------------------------------------------------
# Aggregate risk (global / region / country / category)
# ---------------------------------------------------------------------------

def _event_weight(ev: CrisisEvent, now: datetime) -> float:
    """Weight an event's contribution to an aggregate score.

    Weighted by severity, confidence, population exposure and recency so a
    handful of critical events can't be diluted by hundreds of low-severity
    ones, and so stale events fade out rather than permanently inflating the
    aggregate.
    """
    recency = recency_score(ev.event_date, now)
    base = (
        0.35 * (ev.severity / 100)
        + 0.25 * (ev.confidence_score / 100)
        + 0.25 * (ev.population_exposure / 100)
        + 0.15 * (recency / 100)
    )
    # Resolved events still inform history but shouldn't drive "current" risk.
    if ev.status == "RESOLVED":
        base *= 0.15
    return max(0.01, base)


def weighted_aggregate(events: list[CrisisEvent], now: datetime | None = None) -> float:
    if not events:
        return 0.0
    now = now or datetime.now(timezone.utc)
    num = 0.0
    den = 0.0
    for ev in events:
        w = _event_weight(ev, now)
        num += ev.risk_score * w
        den += w
    return round(num / den, 1) if den else 0.0


CATEGORY_RISK_KEYS = {
    EventCategory.GEOPOLITICAL: "geopolitical_risk",
    EventCategory.NATURAL_DISASTER: "natural_disaster_risk",
    EventCategory.WEATHER: "weather_risk",
    EventCategory.ECONOMIC: "economic_risk",
    EventCategory.INFRASTRUCTURE: "infrastructure_risk",
    EventCategory.CYBER: "cyber_risk",
    EventCategory.HUMANITARIAN: "humanitarian_risk",
    EventCategory.HEALTH: "health_risk",
}


def global_risk_snapshot(events: list[CrisisEvent], now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    global_risk = weighted_aggregate(events, now)
    snapshot = {"global_risk": global_risk}
    for category, key in CATEGORY_RISK_KEYS.items():
        subset = [e for e in events if e.event_category == category.value]
        snapshot[key] = weighted_aggregate(subset, now) if subset else 0.0
    return snapshot


def regional_risk(events: list[CrisisEvent], region: str, now: datetime | None = None) -> float:
    subset = [e for e in events if e.region == region]
    return weighted_aggregate(subset, now)


def country_risk_breakdown(events: list[CrisisEvent], country_code: str, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    subset = [e for e in events if e.country_code == country_code]
    breakdown = {"national_risk": weighted_aggregate(subset, now)}
    for category, key in CATEGORY_RISK_KEYS.items():
        cat_subset = [e for e in subset if e.event_category == category.value]
        breakdown[key.replace("_risk", "")] = weighted_aggregate(cat_subset, now) if cat_subset else 0.0
    breakdown["active_events"] = len([e for e in subset if e.status != "RESOLVED"])
    breakdown["affected_population_estimate"] = round(
        sum(e.population_exposure for e in subset) * 15_000, 0
    )
    return breakdown
