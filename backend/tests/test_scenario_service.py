from app.schemas.scenario import ScenarioParameters
from app.services.scenario_service import apply_parameters


BASELINE = {"global": 50.0, "energy": 50.0, "shipping": 50.0, "market": 50.0}


def test_no_change_returns_baseline():
    after, drivers = apply_parameters(BASELINE, ScenarioParameters())
    assert after == BASELINE
    assert drivers == {}


def test_positive_conflict_intensity_raises_all_domains():
    after, drivers = apply_parameters(BASELINE, ScenarioParameters(conflict_intensity_pct=20))
    assert after["global"] > BASELINE["global"]
    assert after["energy"] > BASELINE["energy"]
    assert after["shipping"] > BASELINE["shipping"]
    assert "conflict_intensity_pct" in drivers


def test_scores_are_clamped_to_0_100():
    after, _ = apply_parameters({"global": 95, "energy": 95, "shipping": 95, "market": 95},
                                 ScenarioParameters(conflict_intensity_pct=200, oil_price_shock_pct=200))
    assert all(0.0 <= v <= 100.0 for v in after.values())

    after_low, _ = apply_parameters({"global": 2, "energy": 2, "shipping": 2, "market": 2},
                                     ScenarioParameters(conflict_intensity_pct=-100))
    assert all(0.0 <= v <= 100.0 for v in after_low.values())


def test_shipping_disruption_affects_shipping_more_than_market():
    after, _ = apply_parameters(BASELINE, ScenarioParameters(shipping_disruption_pct=50))
    shipping_delta = after["shipping"] - BASELINE["shipping"]
    market_delta = after["market"] - BASELINE["market"]
    assert shipping_delta > market_delta
