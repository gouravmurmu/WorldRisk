"""GDELT Cloud API v2 provider adapter.

Docs: https://docs.gdeltcloud.com/api-reference/v2

Used for geopolitical/news intelligence: conflict, protests, political
events, infrastructure/economic/tech/health incidents, and news clustering.
Requires `Authorization: Bearer <GDELT_CLOUD_API_KEY>` — the key lives only
in backend env and is never sent to the browser. Without a key configured,
`fetch_events` / `fetch_stories` short-circuit to empty results and the
provider reports UNCONFIGURED rather than attempting anonymous calls.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.services.normalization_service import NormalizedEvent, NormalizedSource
from app.taxonomy import EventCategory

logger = logging.getLogger("gci.gdelt")

# Coarse GDELT theme/category keyword -> our taxonomy. GDELT Cloud v2 event
# payloads carry free-text categories/themes rather than a fixed enum, so we
# match on keywords rather than an exact lookup table.
THEME_KEYWORDS: list[tuple[str, EventCategory, str]] = [
    ("conflict", EventCategory.GEOPOLITICAL, "Armed Conflict"),
    ("military", EventCategory.GEOPOLITICAL, "Military Activity"),
    ("protest", EventCategory.GEOPOLITICAL, "Protest"),
    ("unrest", EventCategory.GEOPOLITICAL, "Political Unrest"),
    ("terror", EventCategory.GEOPOLITICAL, "Terrorism"),
    ("border", EventCategory.GEOPOLITICAL, "Border Tension"),
    ("cyber", EventCategory.CYBER, "Cyber Attack"),
    ("ransomware", EventCategory.CYBER, "Ransomware"),
    ("outage", EventCategory.CYBER, "Internet Outage"),
    ("power", EventCategory.INFRASTRUCTURE, "Power Failure"),
    ("port", EventCategory.SUPPLY_CHAIN, "Port Closure"),
    ("shipping", EventCategory.SUPPLY_CHAIN, "Shipping Disruption"),
    ("canal", EventCategory.SUPPLY_CHAIN, "Canal Disruption"),
    ("market", EventCategory.ECONOMIC, "Market Shock"),
    ("oil", EventCategory.ECONOMIC, "Oil Shock"),
    ("currency", EventCategory.ECONOMIC, "Currency Crisis"),
    ("outbreak", EventCategory.HEALTH, "Disease Outbreak"),
    ("epidemic", EventCategory.HEALTH, "Disease Outbreak"),
    ("displacement", EventCategory.HUMANITARIAN, "Displacement"),
    ("famine", EventCategory.HUMANITARIAN, "Food Crisis"),
]


def _categorize(text: str) -> tuple[EventCategory, str]:
    lowered = text.lower()
    for keyword, category, label in THEME_KEYWORDS:
        if keyword in lowered:
            return category, label
    return EventCategory.GEOPOLITICAL, "Political Unrest"


class GDELTProvider:
    name = "GDELT"

    def __init__(self):
        self.settings = get_settings()
        self.last_success: datetime | None = None
        self.last_error: str | None = None

    def _configured(self) -> bool:
        return bool(self.settings.gdelt_cloud_api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
        reraise=True,
    )
    async def _get(self, client: httpx.AsyncClient, path: str, params: dict) -> dict:
        resp = await client.get(
            f"{self.settings.gdelt_cloud_base_url}{path}",
            params=params,
            headers={"Authorization": f"Bearer {self.settings.gdelt_cloud_api_key}"},
            timeout=15.0,
        )
        resp.raise_for_status()
        return resp.json()

    async def fetch_events(self, limit: int = 75) -> list[NormalizedEvent]:
        if not self._configured():
            return []
        try:
            async with httpx.AsyncClient() as client:
                data = await self._get(client, "/api/v2/events", {"sort": "significance", "limit": limit})
        except Exception as exc:
            self.last_error = str(exc)
            logger.warning("GDELT fetch failed: %s", exc)
            return []

        self.last_success = datetime.now(timezone.utc)
        self.last_error = None

        items = data.get("events", data.get("data", [])) if isinstance(data, dict) else []
        events: list[NormalizedEvent] = []
        for item in items:
            try:
                normalized = self._normalize_event(item)
                if normalized:
                    events.append(normalized)
            except Exception as exc:
                logger.debug("Skipping malformed GDELT event: %s", exc)
        return events

    async def fetch_stories(self, limit: int = 40) -> list[dict]:
        if not self._configured():
            return []
        try:
            async with httpx.AsyncClient() as client:
                data = await self._get(client, "/api/v2/stories", {"sort": "significance", "limit": limit})
        except Exception as exc:
            self.last_error = str(exc)
            logger.warning("GDELT stories fetch failed: %s", exc)
            return []
        return data.get("stories", data.get("data", [])) if isinstance(data, dict) else []

    def _normalize_event(self, item: dict) -> NormalizedEvent | None:
        lat, lon = item.get("latitude"), item.get("longitude")
        geo = item.get("geo") or {}
        if lat is None:
            lat = geo.get("lat")
        if lon is None:
            lon = geo.get("lon")
        if lat is None or lon is None:
            return None

        title = item.get("title") or item.get("headline") or "Untitled GDELT event"
        theme_text = " ".join(
            str(item.get(k, "")) for k in ("themes", "category", "title", "summary")
        )
        category, event_type_label = _categorize(theme_text)
        significance = float(item.get("significance", item.get("score", 50)) or 50)

        country_code = (item.get("country_code") or item.get("countryCode") or "")[:2].upper()
        event_date = _parse_date(item.get("published_at") or item.get("date")) or datetime.now(timezone.utc)

        sources = []
        for art in (item.get("articles") or [])[:5]:
            sources.append(
                NormalizedSource(
                    provider="GDELT",
                    source_url=art.get("url", ""),
                    title=art.get("title", ""),
                    publisher=art.get("source", art.get("publisher", "")),
                    published_at=_parse_date(art.get("published_at")),
                    source_type="SOURCE_ARTICLE",
                    credibility_score=65.0,
                )
            )

        return NormalizedEvent(
            source="GDELT",
            source_event_id=str(item.get("id", item.get("event_id", ""))),
            event_type=event_type_label,
            event_category=category,
            title=title,
            summary=item.get("summary", ""),
            latitude=float(lat),
            longitude=float(lon),
            country_code=country_code,
            severity_raw=min(100.0, significance),
            confidence_score=60.0,
            population_exposure=significance * 0.5,
            economic_exposure=significance * 0.4,
            escalation_score=significance * 0.55,
            geographic_spread=30.0,
            event_date=event_date,
            source_url=(item.get("articles") or [{}])[0].get("url", "") if item.get("articles") else "",
            sources=sources,
        )

    def health(self) -> dict:
        if not self._configured():
            return {"provider": "GDELT", "status": "UNCONFIGURED", "last_success": None, "last_error": None}
        status = "LIVE" if self.last_error is None and self.last_success else "DEGRADED"
        return {
            "provider": "GDELT",
            "status": status if self.last_success else "UNKNOWN",
            "last_success": self.last_success.isoformat() if self.last_success else None,
            "last_error": self.last_error,
        }


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(value.replace("Z", "")[:19], fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


gdelt_provider = GDELTProvider()
