from datetime import datetime, timedelta, timezone

from app.models.event import CrisisEvent
from app.services.relationship_service import compute_relationships
from app.taxonomy import EventCategory, RelationshipType


def _event(id_, category, country_code, days_ago, lat=0.0, lon=0.0, status="ACTIVE"):
    now = datetime.now(timezone.utc)
    return CrisisEvent(
        id=id_, source="TEST", source_event_id=id_, event_type=category.value,
        event_category=category.value, title=f"Event {id_}", summary="",
        latitude=lat, longitude=lon, country="Testland", country_code=country_code,
        region="Asia", continent="Asia", severity=70, risk_score=70, confidence_score=80,
        event_date=now - timedelta(days=days_ago), population_exposure=50,
        economic_exposure=50, geographic_spread=30, escalation_score=50, status=status,
    )


def test_conflict_propagates_to_supply_chain_same_country():
    conflict = _event("a", EventCategory.GEOPOLITICAL, "UA", days_ago=10)
    supply = _event("b", EventCategory.SUPPLY_CHAIN, "UA", days_ago=2)
    rels = compute_relationships([conflict, supply])

    match = [r for r in rels if r["source_event_id"] == "a" and r["target_event_id"] == "b"]
    assert match
    assert match[0]["relationship_type"] == RelationshipType.SUPPLY_CHAIN_IMPACT.value
    assert match[0]["evidence"] == "INFERRED"


def test_no_relationship_across_unrelated_categories_and_countries():
    a = _event("a", EventCategory.HEALTH, "US", days_ago=5)
    b = _event("b", EventCategory.ECONOMIC, "AU", days_ago=1, lat=40, lon=100)
    rels = compute_relationships([a, b])
    assert rels == []


def test_resolved_events_excluded():
    conflict = _event("a", EventCategory.GEOPOLITICAL, "UA", days_ago=10, status="RESOLVED")
    supply = _event("b", EventCategory.SUPPLY_CHAIN, "UA", days_ago=2)
    rels = compute_relationships([conflict, supply])
    assert rels == []


def test_propagation_requires_forward_time_order():
    later_conflict = _event("a", EventCategory.GEOPOLITICAL, "UA", days_ago=1)
    earlier_supply = _event("b", EventCategory.SUPPLY_CHAIN, "UA", days_ago=10)
    rels = compute_relationships([later_conflict, earlier_supply])
    propagation_matches = [r for r in rels if r["relationship_type"] != RelationshipType.NEARBY.value]
    assert propagation_matches == []
