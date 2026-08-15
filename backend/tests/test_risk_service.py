from datetime import datetime, timedelta, timezone

from app.services import risk_service
from app.taxonomy import SeverityLevel


def test_recency_score_decays_over_time():
    now = datetime.now(timezone.utc)
    fresh = risk_service.recency_score(now, now)
    day_old = risk_service.recency_score(now - timedelta(days=1), now)
    week_old = risk_service.recency_score(now - timedelta(days=7), now)

    assert fresh == 100.0
    assert fresh > day_old > week_old
    assert week_old >= 0


def test_compute_score_weights_sum_to_full_scale():
    components = risk_service.score_components(
        severity=100, population_exposure=100, economic_exposure=100,
        escalation=100, geographic_spread=100, confidence=100,
        event_date=datetime.now(timezone.utc),
    )
    # every component maxed out -> score should hit (or nearly hit) 100
    assert risk_service.compute_score(components) >= 99.0


def test_compute_score_zero_inputs_is_zero():
    components = risk_service.score_components(
        severity=0, population_exposure=0, economic_exposure=0,
        escalation=0, geographic_spread=0, confidence=0,
        event_date=datetime.now(timezone.utc) - timedelta(days=365),
    )
    assert risk_service.compute_score(components) == 0.0


def test_severity_classification_boundaries():
    assert risk_service.severity_level(0) == SeverityLevel.MINIMAL
    assert risk_service.severity_level(20) == SeverityLevel.MINIMAL
    assert risk_service.severity_level(21) == SeverityLevel.LOW
    assert risk_service.severity_level(41) == SeverityLevel.MODERATE
    assert risk_service.severity_level(61) == SeverityLevel.HIGH
    assert risk_service.severity_level(81) == SeverityLevel.CRITICAL
    assert risk_service.severity_level(100) == SeverityLevel.CRITICAL


def test_partially_estimated_flag_propagates():
    components = risk_service.score_components(
        severity=50, population_exposure=50, economic_exposure=50,
        escalation=50, geographic_spread=50, confidence=50,
        event_date=datetime.now(timezone.utc), estimated_fields=["confidence"],
    )
    assert components["partially_estimated"] is True
    assert components["estimated_fields"] == ["confidence"]
