"""Crisis propagation / relationship engine.

Identifies plausible downstream relationships between events — e.g.
CONFLICT -> SHIPPING DISRUPTION -> OIL PRICE PRESSURE -> MARKET VOLATILITY.
Every relationship is labeled OBSERVED, INFERRED, or SCENARIO and carries a
`reason`, `strength`, and `confidence` — nothing is presented as a verified
causal claim. In this deterministic v1, everything the engine produces from
event co-occurrence is INFERRED (OBSERVED is reserved for relationships a
future upstream source explicitly states; SCENARIO is used by the scenario
simulator).
"""
from __future__ import annotations

import math
from datetime import datetime, timezone

from app.models.event import CrisisEvent
from app.taxonomy import EventCategory, RelationshipEvidence, RelationshipType

# category -> plausible downstream categories, with the relationship type and
# a human-readable reason template
PROPAGATION: dict[EventCategory, list[tuple[EventCategory, RelationshipType, str]]] = {
    EventCategory.GEOPOLITICAL: [
        (EventCategory.SUPPLY_CHAIN, RelationshipType.SUPPLY_CHAIN_IMPACT,
         "Conflict/unrest in the same country plausibly disrupts regional shipping and logistics routes."),
        (EventCategory.ECONOMIC, RelationshipType.ECONOMIC_IMPACT,
         "Geopolitical instability commonly precedes commodity or currency market reactions."),
    ],
    EventCategory.NATURAL_DISASTER: [
        (EventCategory.INFRASTRUCTURE, RelationshipType.INFRASTRUCTURE_IMPACT,
         "Natural disasters frequently damage power, transport, or port infrastructure in the affected area."),
        (EventCategory.SUPPLY_CHAIN, RelationshipType.SUPPLY_CHAIN_IMPACT,
         "Disaster-affected regions often see logistics and port disruption in the following days."),
    ],
    EventCategory.WEATHER: [
        (EventCategory.SUPPLY_CHAIN, RelationshipType.SUPPLY_CHAIN_IMPACT,
         "Severe weather systems commonly delay shipping and port operations along the same coastline."),
        (EventCategory.INFRASTRUCTURE, RelationshipType.INFRASTRUCTURE_IMPACT,
         "Extreme weather can strain power and transport infrastructure in the affected region."),
    ],
    EventCategory.CYBER: [
        (EventCategory.INFRASTRUCTURE, RelationshipType.INFRASTRUCTURE_IMPACT,
         "Cyber incidents targeting operational systems can cascade into infrastructure disruption."),
    ],
    EventCategory.INFRASTRUCTURE: [
        (EventCategory.SUPPLY_CHAIN, RelationshipType.SUPPLY_CHAIN_IMPACT,
         "Infrastructure outages upstream commonly delay logistics dependent on that infrastructure."),
        (EventCategory.ECONOMIC, RelationshipType.ECONOMIC_IMPACT,
         "Sustained infrastructure disruption can pressure local economic activity."),
    ],
    EventCategory.SUPPLY_CHAIN: [
        (EventCategory.ECONOMIC, RelationshipType.ECONOMIC_IMPACT,
         "Shipping/logistics disruption commonly feeds through to commodity pricing and inflation risk."),
    ],
}

PROPAGATION_WINDOW_DAYS = 21
NEARBY_WINDOW_DAYS = 14
NEARBY_RADIUS_KM = 600


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(min(1, math.sqrt(a)))


def _days_between(a: datetime, b: datetime) -> float:
    if a.tzinfo is None:
        a = a.replace(tzinfo=timezone.utc)
    if b.tzinfo is None:
        b = b.replace(tzinfo=timezone.utc)
    return abs((a - b).total_seconds()) / 86400


def compute_relationships(events: list[CrisisEvent], max_relationships: int = 400) -> list[dict]:
    relationships: list[dict] = []
    active = [e for e in events if e.status != "RESOLVED"]

    for source in active:
        candidates = PROPAGATION.get(EventCategory(source.event_category), [])
        if not candidates:
            continue
        for target_category, rel_type, reason in candidates:
            for target in active:
                if target.id == source.id or target.event_category != target_category.value:
                    continue
                if target.event_date < source.event_date:
                    continue  # propagation should move forward in time
                delta_days = _days_between(source.event_date, target.event_date)
                if delta_days > PROPAGATION_WINDOW_DAYS:
                    continue
                same_country = target.country_code == source.country_code
                same_region = target.region == source.region
                if not (same_country or same_region):
                    continue

                proximity_factor = 1.0 if same_country else 0.6
                recency_factor = max(0.2, 1 - delta_days / PROPAGATION_WINDOW_DAYS)
                strength = round(min(95, 40 * proximity_factor * recency_factor + source.severity * 0.3), 1)
                confidence = round(min(90, 35 * proximity_factor + source.confidence_score * 0.3), 1)

                relationships.append({
                    "source_event_id": source.id,
                    "target_event_id": target.id,
                    "relationship_type": rel_type.value,
                    "evidence": RelationshipEvidence.INFERRED.value,
                    "reason": reason,
                    "strength": strength,
                    "confidence": confidence,
                })

    # NEARBY: same-ish time & place, regardless of category — surfaces
    # correlated activity the propagation table doesn't explicitly cover.
    for i, a in enumerate(active):
        for b in active[i + 1:]:
            if a.event_category == b.event_category and a.country_code == b.country_code:
                continue  # already likely duplicative coverage of the same story
            delta_days = _days_between(a.event_date, b.event_date)
            if delta_days > NEARBY_WINDOW_DAYS:
                continue
            dist = _haversine_km(a.latitude, a.longitude, b.latitude, b.longitude)
            if dist > NEARBY_RADIUS_KM:
                continue
            strength = round(max(10, 80 * (1 - dist / NEARBY_RADIUS_KM) * (1 - delta_days / NEARBY_WINDOW_DAYS)), 1)
            if strength < 20:
                continue
            relationships.append({
                "source_event_id": a.id,
                "target_event_id": b.id,
                "relationship_type": RelationshipType.NEARBY.value,
                "evidence": RelationshipEvidence.INFERRED.value,
                "reason": f"Events occurred within {int(dist)} km and {delta_days:.1f} days of each other.",
                "strength": strength,
                "confidence": 45.0,
            })

    relationships.sort(key=lambda r: r["strength"], reverse=True)
    return relationships[:max_relationships]
