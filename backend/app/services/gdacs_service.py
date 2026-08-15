"""GDACS (Global Disaster Alert and Coordination System) provider adapter.

Docs: https://www.gdacs.org/gdacsapi/swagger/index.html

GDACS returns GeoJSON FeatureCollections. Field names are not guaranteed
stable across event types, so this adapter reads defensively with `.get()`
fallbacks rather than assuming a fixed schema, and degrades to an empty
result (marking the provider DEGRADED) instead of raising into the caller.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.services.normalization_service import NormalizedEvent, NormalizedSource
from app.taxonomy import EventCategory

logger = logging.getLogger("gci.gdacs")

# GDACS event type codes -> our taxonomy
EVENT_TYPE_MAP: dict[str, tuple[EventCategory, str]] = {
    "EQ": (EventCategory.NATURAL_DISASTER, "Earthquake"),
    "TC": (EventCategory.WEATHER, "Cyclone"),
    "FL": (EventCategory.NATURAL_DISASTER, "Flood"),
    "VO": (EventCategory.NATURAL_DISASTER, "Volcano"),
    "WF": (EventCategory.NATURAL_DISASTER, "Wildfire"),
    "DR": (EventCategory.WEATHER, "Drought"),
    "TS": (EventCategory.NATURAL_DISASTER, "Tsunami"),
}

ALERT_SEVERITY = {"Green": 30.0, "Orange": 60.0, "Red": 90.0}


class GDACSProvider:
    name = "GDACS"

    def __init__(self):
        self.settings = get_settings()
        self.last_success: datetime | None = None
        self.last_error: str | None = None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
        reraise=True,
    )
    async def _get(self, client: httpx.AsyncClient, path: str, params: dict | None = None) -> dict:
        resp = await client.get(f"{self.settings.gdacs_base_url}{path}", params=params, timeout=15.0)
        resp.raise_for_status()
        return resp.json()

    async def fetch_events(self) -> list[NormalizedEvent]:
        try:
            async with httpx.AsyncClient() as client:
                data = await self._get(client, "/Events/geteventlist/MAP")
        except Exception as exc:  # network, timeout, 4xx/5xx after retries
            self.last_error = str(exc)
            logger.warning("GDACS fetch failed: %s", exc)
            return []

        self.last_success = datetime.now(timezone.utc)
        self.last_error = None

        features = data.get("features", []) if isinstance(data, dict) else []
        events: list[NormalizedEvent] = []
        for feat in features:
            try:
                normalized = self._normalize_feature(feat)
                if normalized:
                    events.append(normalized)
            except Exception as exc:  # defensive: one bad feature shouldn't drop the batch
                logger.debug("Skipping malformed GDACS feature: %s", exc)
        return events

    def _normalize_feature(self, feat: dict) -> NormalizedEvent | None:
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [None, None])
        lon, lat = (coords[0], coords[1]) if len(coords) >= 2 else (None, None)
        if lat is None or lon is None:
            return None

        event_type_code = props.get("eventtype", "OTHER")
        category, event_type_label = EVENT_TYPE_MAP.get(
            event_type_code, (EventCategory.NATURAL_DISASTER, event_type_code)
        )

        alert_level = props.get("alertlevel", "Green")
        severity_raw = ALERT_SEVERITY.get(alert_level, 40.0)
        severity_data = props.get("severitydata") or {}
        if isinstance(severity_data, dict) and severity_data.get("severity"):
            try:
                severity_raw = max(severity_raw, min(100.0, float(severity_data["severity"]) * 10))
            except (TypeError, ValueError):
                pass

        population = props.get("population") or {}
        pop_value = 0.0
        if isinstance(population, dict):
            pop_value = float(population.get("value") or 0)
        population_exposure = min(100.0, (pop_value / 500_000) * 100) if pop_value else severity_raw * 0.6

        event_id = str(props.get("eventid", props.get("eventname", "")))
        from_date = props.get("fromdate")
        event_date = _parse_date(from_date) or datetime.now(timezone.utc)

        iso3 = (props.get("iso3") or "")[:2] if props.get("iso3") else ""
        country_code = props.get("iso3", "")[:2] if props.get("iso3") else props.get("country", "")[:2].upper()

        return NormalizedEvent(
            source="GDACS",
            source_event_id=event_id or f"gdacs-{lat}-{lon}",
            event_type=event_type_label,
            event_category=category,
            title=props.get("eventname") or props.get("name") or f"{event_type_label} — {props.get('country', '')}",
            summary=props.get("description", "") or props.get("htmldescription", "") or "",
            latitude=float(lat),
            longitude=float(lon),
            radius_km=float(props.get("radius", 0) or 0),
            country_code=country_code or iso3,
            severity_raw=severity_raw,
            confidence_score=85.0,
            population_exposure=population_exposure,
            economic_exposure=severity_raw * 0.5,
            escalation_score=40.0 if alert_level == "Orange" else (70.0 if alert_level == "Red" else 15.0),
            geographic_spread=min(100.0, float(props.get("radius", 20) or 20) / 2),
            event_date=event_date,
            has_fatalities=bool(props.get("fatalities")),
            fatalities=int(props.get("fatalities") or 0),
            status="ACTIVE" if props.get("iscurrent", "true") in ("true", True, 1) else "MONITORING",
            source_url=props.get("url", {}).get("report", "") if isinstance(props.get("url"), dict) else "",
            sources=[
                NormalizedSource(
                    provider="GDACS",
                    source_url=props.get("url", {}).get("report", "") if isinstance(props.get("url"), dict) else "",
                    title=props.get("eventname", ""),
                    publisher="GDACS",
                    published_at=event_date,
                    source_type="EVENT",
                    credibility_score=90.0,
                )
            ],
        )

    def health(self) -> dict:
        status = "LIVE" if self.last_error is None and self.last_success else "DEGRADED"
        return {
            "provider": "GDACS",
            "status": status if self.last_success else "UNKNOWN",
            "last_success": self.last_success.isoformat() if self.last_success else None,
            "last_error": self.last_error,
        }


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(value.replace("Z", ""), fmt.replace("Z", ""))
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


gdacs_provider = GDACSProvider()
