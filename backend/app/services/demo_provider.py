"""Deterministic demo data provider.

Used whenever DEMO_MODE=true or when GDACS/GDELT are unreachable/unconfigured.
Every value is generated from a fixed random seed so the same "current" state
is reproducible across restarts within a run, while still spreading events
realistically across categories, countries and the last 90 days.

Demo data must never be presented as live: the /api/system/status and
frontend header both surface DEMO MODE explicitly whenever this provider
supplied the active dataset.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from app.services.normalization_service import NormalizedEvent, NormalizedSource
from app.taxonomy import EventCategory

SEED = 20260816

COUNTRY_COORDS: dict[str, tuple[float, float]] = {
    "US": (39.8, -98.5), "CA": (56.1, -106.3), "MX": (23.6, -102.5),
    "BR": (-14.2, -51.9), "AR": (-38.4, -63.6), "CO": (4.6, -74.1),
    "PE": (-9.2, -75.0), "CL": (-35.7, -71.5), "VE": (6.4, -66.6),
    "GB": (55.4, -3.4), "FR": (46.6, 2.2), "DE": (51.2, 10.4),
    "IT": (41.9, 12.6), "ES": (40.5, -3.7), "UA": (48.4, 31.2),
    "PL": (51.9, 19.1), "RO": (45.9, 24.9), "GR": (39.1, 21.8),
    "PT": (39.4, -8.2), "NL": (52.1, 5.3), "TR": (38.9, 35.2),
    "NG": (9.1, 8.7), "ET": (9.1, 40.5), "SD": (12.9, 30.2),
    "CD": (-4.0, 21.8), "SO": (5.2, 46.2), "KE": (-0.0, 37.9),
    "ZA": (-30.6, 22.9), "EG": (26.8, 30.8), "LY": (26.3, 17.2),
    "ML": (17.6, -4.0), "MZ": (-18.7, 35.5), "MA": (31.8, -7.1),
    "IL": (31.0, 34.8), "PS": (31.9, 35.2), "LB": (33.9, 35.9),
    "SY": (34.8, 38.9), "IQ": (33.2, 43.7), "IR": (32.4, 53.7),
    "SA": (23.9, 45.1), "YE": (15.6, 48.0), "JO": (30.6, 36.2),
    "CN": (35.9, 104.2), "IN": (20.6, 79.0), "PK": (30.4, 69.3),
    "BD": (23.7, 90.4), "JP": (36.2, 138.3), "KR": (35.9, 127.8),
    "KP": (40.3, 127.5), "ID": (-0.8, 113.9), "PH": (12.9, 121.8),
    "VN": (14.1, 108.3), "TH": (15.9, 100.99), "MM": (21.9, 95.9),
    "NP": (28.4, 84.1), "AF": (33.9, 67.7), "TW": (23.7, 121.0),
    "LK": (7.9, 80.8), "MY": (4.2, 101.9),
    "AU": (-25.3, 133.8), "NZ": (-40.9, 174.9), "PG": (-6.3, 143.9), "FJ": (-17.7, 178.1),
}

CATEGORY_TYPES: dict[EventCategory, list[str]] = {
    EventCategory.GEOPOLITICAL: ["Armed Conflict", "Military Activity", "Political Unrest", "Protest", "Terrorism", "Border Tension"],
    EventCategory.NATURAL_DISASTER: ["Earthquake", "Tsunami", "Volcano", "Flood", "Wildfire", "Landslide"],
    EventCategory.WEATHER: ["Cyclone", "Hurricane", "Extreme Rain", "Heatwave", "Drought", "Severe Storm"],
    EventCategory.HUMANITARIAN: ["Displacement", "Food Crisis", "Humanitarian Emergency"],
    EventCategory.CYBER: ["Cyber Attack", "Ransomware", "Infrastructure Attack", "Internet Outage"],
    EventCategory.INFRASTRUCTURE: ["Power Failure", "Transport Disruption", "Port Disruption", "Industrial Accident"],
    EventCategory.SUPPLY_CHAIN: ["Shipping Disruption", "Port Closure", "Canal Disruption", "Logistics Disruption"],
    EventCategory.ECONOMIC: ["Market Shock", "Commodity Shock", "Oil Shock", "Currency Crisis"],
    EventCategory.HEALTH: ["Disease Outbreak", "Public Health Emergency"],
}

# Weighted so geopolitical/natural-disaster/weather dominate, mirroring real feeds.
CATEGORY_WEIGHTS: dict[EventCategory, float] = {
    EventCategory.GEOPOLITICAL: 22, EventCategory.NATURAL_DISASTER: 20,
    EventCategory.WEATHER: 16, EventCategory.HUMANITARIAN: 8,
    EventCategory.CYBER: 8, EventCategory.INFRASTRUCTURE: 9,
    EventCategory.SUPPLY_CHAIN: 6, EventCategory.ECONOMIC: 7, EventCategory.HEALTH: 4,
}

PUBLISHERS = [
    "Reuters", "Associated Press", "Al Jazeera", "BBC World", "AFP",
    "Bloomberg", "The Guardian", "Regional Wire Service", "National Broadcaster",
]

HOTSPOT_COUNTRIES = ["UA", "IL", "SY", "SO", "MM", "SD", "PH", "ID", "IR", "YE"]

# Guaranteed at least one event each, one region apiece, so the Countries
# page always has a populated example for major/populous countries instead
# of leaving coverage entirely to chance in a fixed-seed random draw.
SHOWCASE_COUNTRIES = ["IN", "US", "CN", "BR", "NG", "DE", "GB", "JP", "ZA", "AU", "MX", "EG"]

# Max +/- degrees to jitter an event's coordinates away from its country's
# center point, scaled to roughly match real geographic extent. A flat
# jitter for every country (e.g. +/-4 degrees, ~440km) looks fine for a
# continent-sized country like the US but reliably pushes small/narrow
# countries' events into their neighbors — e.g. a Bangladesh event landing
# in Nepal, ~450km away. Unlisted countries fall back to MEDIUM.
LARGE_JITTER_DEGREES = 4.0
MEDIUM_JITTER_DEGREES = 1.2
SMALL_JITTER_DEGREES = 0.5

LARGE_COUNTRIES = {"US", "CA", "BR", "CN", "AU", "IN", "AR", "MX", "KZ", "DZ"}
SMALL_COUNTRIES = {
    "BD", "NP", "LK", "IL", "PS", "LB", "JO", "GR", "PT", "NL",
    "FJ", "TW", "KP", "KR", "SY", "MZ", "MY",
}


def _jitter_degrees(country_code: str) -> float:
    if country_code in LARGE_COUNTRIES:
        return LARGE_JITTER_DEGREES
    if country_code in SMALL_COUNTRIES:
        return SMALL_JITTER_DEGREES
    return MEDIUM_JITTER_DEGREES

TITLE_TEMPLATES = {
    "Armed Conflict": "Clashes reported near {country} border region",
    "Military Activity": "Military buildup observed in {country}",
    "Political Unrest": "Political unrest escalates across {country}",
    "Protest": "Mass protests continue in {country} capital",
    "Terrorism": "Security forces respond to attack in {country}",
    "Border Tension": "Tensions rise along {country} frontier",
    "Earthquake": "Magnitude {mag} earthquake strikes {country}",
    "Tsunami": "Tsunami warning issued for {country} coastline",
    "Volcano": "Volcanic activity increases in {country}",
    "Flood": "Severe flooding displaces thousands in {country}",
    "Wildfire": "Wildfires spread across {country} region",
    "Landslide": "Landslide blocks major route in {country}",
    "Cyclone": "Tropical cyclone approaches {country} coast",
    "Hurricane": "Hurricane strengthens near {country}",
    "Extreme Rain": "Record rainfall triggers flooding in {country}",
    "Heatwave": "Extreme heatwave grips {country}",
    "Drought": "Severe drought conditions worsen in {country}",
    "Severe Storm": "Severe storm system moves through {country}",
    "Displacement": "New displacement wave reported in {country}",
    "Food Crisis": "Food insecurity worsens in {country}",
    "Humanitarian Emergency": "Humanitarian emergency declared in {country}",
    "Cyber Attack": "Cyberattack disrupts services linked to {country}",
    "Ransomware": "Ransomware incident hits {country} infrastructure",
    "Infrastructure Attack": "Critical infrastructure targeted in {country}",
    "Internet Outage": "Widespread internet outage reported in {country}",
    "Power Failure": "Major power failure affects {country} grid",
    "Transport Disruption": "Transport network disrupted in {country}",
    "Port Disruption": "Port operations disrupted in {country}",
    "Industrial Accident": "Industrial accident reported in {country}",
    "Shipping Disruption": "Shipping delays reported near {country}",
    "Port Closure": "Major port closure affects {country} trade",
    "Canal Disruption": "Canal transit disrupted, impacting {country} trade routes",
    "Logistics Disruption": "Logistics network strained in {country}",
    "Market Shock": "Markets react to shock linked to {country}",
    "Commodity Shock": "Commodity prices swing on {country} disruption",
    "Oil Shock": "Oil markets react to developments in {country}",
    "Currency Crisis": "Currency volatility hits {country}",
    "Disease Outbreak": "Disease outbreak reported in {country}",
    "Public Health Emergency": "Public health emergency declared in {country}",
}

# Per-event-type structured metrics: (key, low, high, decimal_places).
# Values are sampled with a bias toward the high end for higher-severity
# events (see _generate_metrics), giving a plausible category-appropriate
# detail panel — e.g. magnitude/depth for an earthquake, wind speed for a
# cyclone — instead of every event showing the same generic fields.
METRIC_SPECS: dict[str, list[tuple[str, float, float, int]]] = {
    "Earthquake": [("magnitude", 4.5, 8.2, 1), ("depth_km", 2, 120, 0)],
    "Tsunami": [("wave_height_m", 0.5, 8.0, 1)],
    "Volcano": [("ash_altitude_km", 1, 15, 0)],
    "Flood": [("water_level_m", 0.5, 6.0, 1), ("displaced_estimate", 500, 250000, 0)],
    "Wildfire": [("area_burned_hectares", 100, 80000, 0), ("containment_pct", 5, 90, 0)],
    "Landslide": [("blocked_routes", 1, 6, 0)],
    "Cyclone": [("wind_speed_kmh", 90, 250, 0), ("pressure_hpa", 900, 990, 0)],
    "Hurricane": [("wind_speed_kmh", 120, 280, 0), ("pressure_hpa", 900, 980, 0)],
    "Extreme Rain": [("rainfall_mm_24h", 80, 500, 0)],
    "Heatwave": [("peak_temp_c", 38, 50, 1)],
    "Drought": [("duration_months", 2, 24, 0)],
    "Severe Storm": [("wind_gust_kmh", 60, 150, 0)],
    "Displacement": [("displaced_estimate", 1000, 500000, 0)],
    "Food Crisis": [("people_in_need", 5000, 2000000, 0)],
    "Humanitarian Emergency": [("people_in_need", 5000, 3000000, 0)],
    "Cyber Attack": [("systems_affected", 1, 200, 0)],
    "Ransomware": [("organizations_affected", 1, 40, 0)],
    "Infrastructure Attack": [("facilities_targeted", 1, 12, 0)],
    "Internet Outage": [("users_affected_millions", 0.01, 8.0, 2), ("duration_hours", 0.5, 48, 1)],
    "Power Failure": [("households_affected", 500, 900000, 0), ("duration_hours", 0.5, 36, 1)],
    "Transport Disruption": [("routes_affected", 1, 15, 0), ("delay_hours", 1, 48, 0)],
    "Port Disruption": [("vessels_delayed", 1, 40, 0)],
    "Industrial Accident": [("injuries", 0, 60, 0)],
    "Shipping Disruption": [("vessels_affected", 1, 60, 0), ("delay_days", 1, 14, 0)],
    "Port Closure": [("cargo_volume_impacted_pct", 5, 90, 0)],
    "Canal Disruption": [("transit_delay_days", 1, 21, 0)],
    "Logistics Disruption": [("shipments_delayed", 10, 5000, 0)],
    "Market Shock": [("index_change_pct", -12, -0.5, 1)],
    "Commodity Shock": [("price_change_pct", -20, 25, 1)],
    "Oil Shock": [("price_change_pct", -15, 30, 1)],
    "Currency Crisis": [("currency_change_pct", -30, -2, 1)],
    "Armed Conflict": [("casualties_estimate", 1, 500, 0)],
    "Military Activity": [("forces_deployed_estimate", 100, 20000, 0)],
    "Political Unrest": [("protest_size_estimate", 200, 100000, 0)],
    "Protest": [("protest_size_estimate", 200, 150000, 0)],
    "Terrorism": [("casualties_estimate", 0, 100, 0)],
    "Border Tension": [("forces_deployed_estimate", 100, 15000, 0)],
    "Disease Outbreak": [("cases_reported", 5, 50000, 0), ("case_fatality_rate_pct", 0.1, 8.0, 1)],
    "Public Health Emergency": [("affected_population", 1000, 2000000, 0)],
}

METRIC_LABELS = {
    "magnitude": "Magnitude", "depth_km": "Depth (km)", "wave_height_m": "Wave Height (m)",
    "ash_altitude_km": "Ash Altitude (km)", "water_level_m": "Water Level (m)",
    "displaced_estimate": "Displaced (est.)", "area_burned_hectares": "Area Burned (ha)",
    "containment_pct": "Containment", "blocked_routes": "Routes Blocked",
    "wind_speed_kmh": "Wind Speed (km/h)", "pressure_hpa": "Pressure (hPa)",
    "rainfall_mm_24h": "Rainfall, 24h (mm)", "peak_temp_c": "Peak Temp (°C)",
    "duration_months": "Duration (months)", "wind_gust_kmh": "Wind Gust (km/h)",
    "people_in_need": "People in Need", "systems_affected": "Systems Affected",
    "organizations_affected": "Organizations Affected", "facilities_targeted": "Facilities Targeted",
    "users_affected_millions": "Users Affected (M)", "duration_hours": "Duration (hours)",
    "households_affected": "Households Affected", "routes_affected": "Routes Affected",
    "delay_hours": "Delay (hours)", "vessels_delayed": "Vessels Delayed", "injuries": "Injuries",
    "vessels_affected": "Vessels Affected", "delay_days": "Delay (days)",
    "cargo_volume_impacted_pct": "Cargo Volume Impacted", "transit_delay_days": "Transit Delay (days)",
    "shipments_delayed": "Shipments Delayed", "index_change_pct": "Index Change",
    "price_change_pct": "Price Change", "currency_change_pct": "Currency Change",
    "casualties_estimate": "Casualties (est.)", "forces_deployed_estimate": "Forces Deployed (est.)",
    "protest_size_estimate": "Protest Size (est.)", "cases_reported": "Cases Reported",
    "case_fatality_rate_pct": "Case Fatality Rate", "affected_population": "Affected Population",
}


def _generate_metrics(event_type: str, severity: float, rng: random.Random) -> dict:
    specs = METRIC_SPECS.get(event_type, [])
    severity_frac = max(0.15, min(1.0, severity / 100))
    metrics: dict[str, float] = {}
    for key, low, high, decimals in specs:
        span = high - low
        center = low + span * severity_frac
        spread = span * 0.2
        value = rng.uniform(max(low, center - spread), min(high, center + spread))
        metrics[key] = round(value, decimals) if decimals else round(value)
    return metrics


def _generate_timeline(rng: random.Random, event_date: datetime, status: str, trend: str, now: datetime) -> list[dict]:
    steps: list[tuple[str, datetime]] = [("Event detected", event_date)]
    t = event_date + timedelta(hours=rng.uniform(1, 6))
    steps.append(("Initial severity assessment completed", t))
    if rng.random() < 0.7:
        t = t + timedelta(hours=rng.uniform(2, 20))
        steps.append(("Additional source corroborated the report", t))
    if trend == "ESCALATING":
        t = t + timedelta(hours=rng.uniform(4, 30))
        steps.append(("Severity upgraded following new reports", t))
    t = t + timedelta(hours=rng.uniform(2, 24))
    steps.append(("Impact estimate updated", t))
    if status == "RESOLVED":
        t = t + timedelta(hours=rng.uniform(12, 72))
        steps.append(("Situation stabilized; marked resolved", t))
    elif status == "MONITORING":
        t = t + timedelta(hours=rng.uniform(6, 48))
        steps.append(("Downgraded to monitoring status", t))
    return [{"time": min(time, now).isoformat(), "label": label} for label, time in steps if time <= now + timedelta(hours=1)]


def _format_metric(key: str, value: float) -> str:
    label = METRIC_LABELS.get(key, key.replace("_", " ").title())
    if key.endswith("_pct"):
        return f"{label} {value:+.1f}%" if value < 0 or key.endswith("change_pct") else f"{label} {value:.0f}%"
    return f"{label} {value:g}"


def _generate_article(
    event_type: str, country: str, severity_raw: float, metrics: dict,
    trend: str, has_fatalities: bool, fatalities: int, n_sources: int,
) -> str:
    severity_word = (
        "severe" if severity_raw > 75 else
        "significant" if severity_raw > 50 else
        "moderate" if severity_raw > 25 else "limited"
    )
    trend_phrase = {
        "ESCALATING": "Analysts note the situation is escalating and warrants close monitoring.",
        "DE_ESCALATING": "Conditions appear to be gradually improving.",
        "STABLE": "The situation remains largely stable at this time.",
    }[trend]

    metric_bits = [_format_metric(k, v) for k, v in metrics.items()]
    metric_sentence = f" Reported figures: {', '.join(metric_bits)}." if metric_bits else ""
    fatality_sentence = f" At least {fatalities} fatalities have been reported." if has_fatalities else ""
    article_word = "An" if event_type[0].lower() in "aeiou" else "A"

    return (
        f"{article_word} {event_type.lower()} has been reported in {country}, assessed as {severity_word} impact "
        f"based on {n_sources} corroborating source(s).{metric_sentence}{fatality_sentence} {trend_phrase} "
        f"This assessment will update automatically as new source data is ingested."
    )


def _weighted_category(rng: random.Random) -> EventCategory:
    categories = list(CATEGORY_WEIGHTS.keys())
    weights = list(CATEGORY_WEIGHTS.values())
    return rng.choices(categories, weights=weights, k=1)[0]


def _title_for(event_type: str, country: str, rng: random.Random) -> str:
    template = TITLE_TEMPLATES.get(event_type, f"{event_type} reported in {{country}}")
    return template.format(country=country, mag=round(rng.uniform(4.5, 8.1), 1))


def generate_events(count: int = 140) -> list[NormalizedEvent]:
    from app.services.normalization_service import country_name

    rng = random.Random(SEED)
    now = datetime.now(timezone.utc)
    countries = list(COUNTRY_COORDS.keys())
    events: list[NormalizedEvent] = []

    for i in range(count):
        category = _weighted_category(rng)
        event_type = rng.choice(CATEGORY_TYPES[category])

        if i < len(SHOWCASE_COUNTRIES):
            # First N events guarantee coverage for major/populous countries
            cc = SHOWCASE_COUNTRIES[i]
        elif rng.random() < 0.3:
            # 30% of the remaining events cluster in hotspot countries for narrative coherence
            cc = rng.choice(HOTSPOT_COUNTRIES)
        else:
            cc = rng.choice(countries)
        base_lat, base_lon = COUNTRY_COORDS[cc]
        jitter = _jitter_degrees(cc)
        lat = max(-85, min(85, base_lat + rng.uniform(-jitter, jitter)))
        lon = max(-179, min(179, base_lon + rng.uniform(-jitter, jitter)))

        # recency-biased age in days (more recent events more likely)
        age_days = rng.betavariate(1.6, 4.5) * 90
        event_date = now - timedelta(days=age_days, hours=rng.uniform(0, 23))

        is_hotspot = cc in HOTSPOT_COUNTRIES
        severity_raw = rng.gauss(58 if is_hotspot else 42, 18)
        severity_raw = max(5, min(99, severity_raw))

        escalation = max(0, min(100, severity_raw * rng.uniform(0.6, 1.2) - age_days * 0.3))
        trend = "ESCALATING" if escalation > 62 else ("DE_ESCALATING" if escalation < 25 else "STABLE")

        pop_exposure = max(0, min(100, severity_raw * rng.uniform(0.5, 1.15)))
        econ_exposure = max(0, min(100, severity_raw * rng.uniform(0.4, 1.1)))
        geo_spread = max(0, min(100, rng.uniform(10, 45) + (20 if category in (
            EventCategory.WEATHER, EventCategory.NATURAL_DISASTER
        ) else 0)))
        confidence = max(40, min(98, rng.gauss(78, 10)))

        fatalities = 0
        has_fatalities = False
        if category in (EventCategory.NATURAL_DISASTER, EventCategory.GEOPOLITICAL, EventCategory.WEATHER) and rng.random() < 0.22:
            fatalities = int(rng.expovariate(1 / 12)) + 1
            has_fatalities = True

        status = "RESOLVED" if age_days > 75 and rng.random() < 0.5 else ("MONITORING" if age_days > 40 else "ACTIVE")

        n_sources = rng.randint(1, 4)
        sources = [
            NormalizedSource(
                provider=rng.choice(["GDACS", "GDELT"]),
                source_url=f"https://example-news.invalid/article/{i}-{s}",
                title=_title_for(event_type, country_name(cc), rng),
                publisher=rng.choice(PUBLISHERS),
                published_at=event_date + timedelta(hours=s),
                source_type="SOURCE_ARTICLE",
                credibility_score=rng.uniform(55, 92),
            )
            for s in range(n_sources)
        ]

        metrics = _generate_metrics(event_type, severity_raw, rng)
        timeline = _generate_timeline(rng, event_date, status, trend, now)
        article = _generate_article(
            event_type, country_name(cc), severity_raw, metrics,
            trend, has_fatalities, fatalities, n_sources,
        )

        events.append(
            NormalizedEvent(
                source="DEMO",
                source_event_id=f"demo-{i:04d}",
                event_type=event_type,
                event_category=category,
                title=_title_for(event_type, country_name(cc), rng),
                summary=(
                    f"Analysts are tracking a {event_type.lower()} affecting {country_name(cc)}. "
                    f"Severity is assessed as {'elevated' if severity_raw > 60 else 'moderate' if severity_raw > 35 else 'limited'} "
                    f"based on {n_sources} corroborating source(s)."
                ),
                latitude=round(lat, 3),
                longitude=round(lon, 3),
                radius_km=round(rng.uniform(15, 250), 1),
                country_code=cc,
                severity_raw=round(severity_raw, 1),
                confidence_score=round(confidence, 1),
                population_exposure=round(pop_exposure, 1),
                economic_exposure=round(econ_exposure, 1),
                escalation_score=round(escalation, 1),
                geographic_spread=round(geo_spread, 1),
                event_date=event_date,
                has_fatalities=has_fatalities,
                fatalities=fatalities,
                status=status,
                trend=trend,
                source_url=sources[0].source_url if sources else "",
                sources=sources,
                metrics=metrics,
                timeline=timeline,
                article=article,
            )
        )

    return events
