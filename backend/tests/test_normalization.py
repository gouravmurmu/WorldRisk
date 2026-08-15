from datetime import datetime, timezone

from app.services.normalization_service import NormalizedEvent, country_name, region_for
from app.taxonomy import EventCategory


def test_region_lookup_known_country():
    region, continent = region_for("JP")
    assert region == "Asia"
    assert continent == "Asia"


def test_region_lookup_unknown_country_falls_back():
    region, continent = region_for("ZZ")
    assert region == "Asia"  # documented default bucket, not a crash


def test_country_name_known_and_unknown():
    assert country_name("US") == "United States"
    assert country_name("ZZ") == "ZZ"  # unknown code echoes back verbatim


def test_normalized_event_with_region():
    event = NormalizedEvent(
        source="GDACS", source_event_id="1", event_type="Earthquake",
        event_category=EventCategory.NATURAL_DISASTER, title="Test", summary="",
        latitude=35.0, longitude=139.0, country_code="JP",
        event_date=datetime.now(timezone.utc),
    )
    info = event.with_region()
    assert info == {"country": "Japan", "region": "Asia", "continent": "Asia"}
