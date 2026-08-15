"""Normalization layer: every provider adapter produces a NormalizedEvent,
regardless of upstream schema. This is the seam that keeps the frontend and
the rest of the backend decoupled from GDACS/GDELT-specific field names.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.taxonomy import EventCategory

# Rough country -> (region, continent) lookup used to bucket events for the
# regional risk panel. Intentionally coarse; good enough for dashboard
# aggregation, not a substitute for a full geo-reference dataset.
COUNTRY_REGION: dict[str, tuple[str, str]] = {
    "US": ("North America", "North America"), "CA": ("North America", "North America"),
    "MX": ("North America", "North America"),
    "BR": ("South America", "South America"), "AR": ("South America", "South America"),
    "CO": ("South America", "South America"), "PE": ("South America", "South America"),
    "CL": ("South America", "South America"), "VE": ("South America", "South America"),
    "GB": ("Europe", "Europe"), "FR": ("Europe", "Europe"), "DE": ("Europe", "Europe"),
    "IT": ("Europe", "Europe"), "ES": ("Europe", "Europe"), "UA": ("Europe", "Europe"),
    "PL": ("Europe", "Europe"), "RO": ("Europe", "Europe"), "GR": ("Europe", "Europe"),
    "TR": ("Middle East", "Asia"), "PT": ("Europe", "Europe"), "NL": ("Europe", "Europe"),
    "NG": ("Africa", "Africa"), "ET": ("Africa", "Africa"), "SD": ("Africa", "Africa"),
    "CD": ("Africa", "Africa"), "SO": ("Africa", "Africa"), "KE": ("Africa", "Africa"),
    "ZA": ("Africa", "Africa"), "EG": ("Africa", "Africa"), "LY": ("Africa", "Africa"),
    "ML": ("Africa", "Africa"), "MZ": ("Africa", "Africa"), "MA": ("Africa", "Africa"),
    "IL": ("Middle East", "Asia"), "PS": ("Middle East", "Asia"), "LB": ("Middle East", "Asia"),
    "SY": ("Middle East", "Asia"), "IQ": ("Middle East", "Asia"), "IR": ("Middle East", "Asia"),
    "SA": ("Middle East", "Asia"), "YE": ("Middle East", "Asia"), "JO": ("Middle East", "Asia"),
    "CN": ("Asia", "Asia"), "IN": ("Asia", "Asia"), "PK": ("Asia", "Asia"),
    "BD": ("Asia", "Asia"), "JP": ("Asia", "Asia"), "KR": ("Asia", "Asia"),
    "KP": ("Asia", "Asia"), "ID": ("Asia", "Asia"), "PH": ("Asia", "Asia"),
    "VN": ("Asia", "Asia"), "TH": ("Asia", "Asia"), "MM": ("Asia", "Asia"),
    "NP": ("Asia", "Asia"), "AF": ("Asia", "Asia"), "TW": ("Asia", "Asia"),
    "LK": ("Asia", "Asia"), "MY": ("Asia", "Asia"),
    "AU": ("Oceania", "Oceania"), "NZ": ("Oceania", "Oceania"), "PG": ("Oceania", "Oceania"),
    "FJ": ("Oceania", "Oceania"),
}

COUNTRY_NAMES: dict[str, str] = {
    "US": "United States", "CA": "Canada", "MX": "Mexico", "BR": "Brazil",
    "AR": "Argentina", "CO": "Colombia", "PE": "Peru", "CL": "Chile", "VE": "Venezuela",
    "GB": "United Kingdom", "FR": "France", "DE": "Germany", "IT": "Italy", "ES": "Spain",
    "UA": "Ukraine", "PL": "Poland", "RO": "Romania", "GR": "Greece", "PT": "Portugal",
    "NL": "Netherlands", "TR": "Turkey", "NG": "Nigeria", "ET": "Ethiopia", "SD": "Sudan",
    "CD": "DR Congo", "SO": "Somalia", "KE": "Kenya", "ZA": "South Africa", "EG": "Egypt",
    "LY": "Libya", "ML": "Mali", "MZ": "Mozambique", "MA": "Morocco", "IL": "Israel",
    "PS": "Palestine", "LB": "Lebanon", "SY": "Syria", "IQ": "Iraq", "IR": "Iran",
    "SA": "Saudi Arabia", "YE": "Yemen", "JO": "Jordan", "CN": "China", "IN": "India",
    "PK": "Pakistan", "BD": "Bangladesh", "JP": "Japan", "KR": "South Korea",
    "KP": "North Korea", "ID": "Indonesia", "PH": "Philippines", "VN": "Vietnam",
    "TH": "Thailand", "MM": "Myanmar", "NP": "Nepal", "AF": "Afghanistan", "TW": "Taiwan",
    "LK": "Sri Lanka", "MY": "Malaysia", "AU": "Australia", "NZ": "New Zealand",
    "PG": "Papua New Guinea", "FJ": "Fiji",
}


def region_for(country_code: str) -> tuple[str, str]:
    return COUNTRY_REGION.get(country_code, ("Asia", "Asia"))


def country_name(country_code: str) -> str:
    return COUNTRY_NAMES.get(country_code, country_code)


@dataclass
class NormalizedSource:
    provider: str
    source_url: str = ""
    title: str = ""
    publisher: str = ""
    published_at: datetime | None = None
    source_type: str = "SOURCE_ARTICLE"  # EVENT | STORY | SOURCE_ARTICLE
    credibility_score: float = 70.0


@dataclass
class NormalizedEvent:
    source: str
    source_event_id: str
    event_type: str
    event_category: EventCategory
    title: str
    summary: str

    latitude: float
    longitude: float
    radius_km: float = 0.0

    country_code: str = ""
    admin1: str = ""

    severity_raw: float = 50.0  # 0-100, provider's own severity estimate
    confidence_score: float = 70.0
    population_exposure: float = 0.0  # 0-100 normalized
    economic_exposure: float = 0.0  # 0-100 normalized
    escalation_score: float = 0.0  # 0-100
    geographic_spread: float = 0.0  # 0-100

    event_date: datetime | None = None
    has_fatalities: bool = False
    fatalities: int = 0

    status: str = "ACTIVE"
    trend: str = "STABLE"

    source_url: str = ""
    sources: list[NormalizedSource] = field(default_factory=list)

    def with_region(self) -> dict:
        region, continent = region_for(self.country_code)
        return {
            "country": country_name(self.country_code),
            "region": region,
            "continent": continent,
        }
