"""Scenario simulator — deterministic, explainable "what if" projections.

This is explicitly NOT a forecast. Each hypothetical parameter (conflict
intensity, shipping disruption, oil price shock, extreme weather, cyber
activity) is mapped to a fixed set of coefficients describing how many risk
points it would plausibly add to each domain at +100%. The relationships
are hand-authored and transparent, matching the "deterministic first" brief
— a trained propagation model could later replace `IMPACT_COEFFICIENTS`
without changing the API shape.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.scenario import RiskDelta, ScenarioParameters, ScenarioResult
from app.services import query_service, risk_service
from app.taxonomy import EventCategory

# points added to each domain per +100% of the parameter
IMPACT_COEFFICIENTS: dict[str, dict[str, float]] = {
    "conflict_intensity_pct":  {"global": 10, "energy": 14, "shipping": 16, "market": 12},
    "shipping_disruption_pct": {"global": 6,  "energy": 9,  "shipping": 22, "market": 10},
    "oil_price_shock_pct":     {"global": 5,  "energy": 20, "shipping": 6,  "market": 16},
    "extreme_weather_pct":     {"global": 5,  "energy": 4,  "shipping": 12, "market": 5},
    "cyber_activity_pct":      {"global": 4,  "energy": 3,  "shipping": 6,  "market": 6},
}

DOMAIN_LABELS = {"global": "Global Risk", "energy": "Energy Risk", "shipping": "Shipping Risk", "market": "Market Risk"}

PARAM_LABELS = {
    "conflict_intensity_pct": "Conflict intensity",
    "shipping_disruption_pct": "Shipping disruption",
    "oil_price_shock_pct": "Oil price shock",
    "extreme_weather_pct": "Extreme weather",
    "cyber_activity_pct": "Cyber activity",
}


def _baseline_domains(db: Session) -> dict[str, float]:
    snapshot = query_service.global_risk(db)
    events = query_service.all_active_events(db)
    supply_chain_events = [e for e in events if e.event_category == EventCategory.SUPPLY_CHAIN.value]
    shipping_baseline = risk_service.weighted_aggregate(supply_chain_events) if supply_chain_events else (
        snapshot["infrastructure_risk"] * 0.6
    )
    return {
        "global": snapshot["global_risk"],
        "energy": snapshot["economic_risk"],
        "shipping": max(shipping_baseline, snapshot["infrastructure_risk"] * 0.4),
        "market": snapshot["economic_risk"],
    }


def apply_parameters(baseline: dict[str, float], params: ScenarioParameters) -> tuple[dict[str, float], dict[str, float]]:
    """Pure function: baseline domain scores + parameters -> (after, driver_contributions).

    Split out from `simulate` so the propagation math can be unit tested
    without a database session.
    """
    param_dict = params.model_dump()
    after = dict(baseline)
    driver_contributions: dict[str, float] = {}

    for param_key, pct in param_dict.items():
        if pct == 0:
            continue
        coeffs = IMPACT_COEFFICIENTS.get(param_key, {})
        fraction = pct / 100.0
        total_effect = 0.0
        for domain, coeff in coeffs.items():
            delta = coeff * fraction
            after[domain] = after[domain] + delta
            total_effect += abs(delta)
        driver_contributions[param_key] = total_effect

    for domain in after:
        after[domain] = round(max(0.0, min(100.0, after[domain])), 1)

    return after, driver_contributions


def simulate(db: Session, params: ScenarioParameters) -> ScenarioResult:
    baseline = _baseline_domains(db)
    param_dict = params.model_dump()
    after, driver_contributions = apply_parameters(baseline, params)

    deltas = [
        RiskDelta(label=DOMAIN_LABELS[d], before=round(baseline[d], 1), after=after[d])
        for d in ("energy", "shipping", "market")
    ]

    sorted_drivers = sorted(driver_contributions.items(), key=lambda kv: kv[1], reverse=True)
    narrative = []
    for param_key, _ in sorted_drivers[:3]:
        pct = param_dict[param_key]
        narrative.append(
            f"{PARAM_LABELS[param_key]} adjusted by {pct:+.0f}% — propagates into energy, "
            f"shipping and market risk based on fixed scenario coefficients, not live modeling."
        )
    if not narrative:
        narrative.append("No parameters were adjusted from baseline.")

    return ScenarioResult(
        parameters=params,
        global_risk=RiskDelta(label="Global Risk", before=round(baseline["global"], 1), after=after["global"]),
        deltas=deltas,
        narrative=narrative,
    )
