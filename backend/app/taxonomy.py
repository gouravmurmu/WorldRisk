"""Canonical event taxonomy every provider normalizes into.

Keeping this in one module means the risk engine, the map legend colors,
and the AI tool schemas all read from the same source of truth instead of
drifting between provider-specific vocabularies.
"""
from enum import Enum


class EventCategory(str, Enum):
    GEOPOLITICAL = "GEOPOLITICAL"
    NATURAL_DISASTER = "NATURAL_DISASTER"
    WEATHER = "WEATHER"
    HUMANITARIAN = "HUMANITARIAN"
    CYBER = "CYBER"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    SUPPLY_CHAIN = "SUPPLY_CHAIN"
    ECONOMIC = "ECONOMIC"
    HEALTH = "HEALTH"
    OTHER = "OTHER"


SUBCATEGORIES: dict[EventCategory, list[str]] = {
    EventCategory.GEOPOLITICAL: [
        "Armed Conflict", "Military Activity", "Political Unrest",
        "Protest", "Terrorism", "Border Tension",
    ],
    EventCategory.NATURAL_DISASTER: [
        "Earthquake", "Tsunami", "Volcano", "Flood", "Wildfire", "Landslide",
    ],
    EventCategory.WEATHER: [
        "Cyclone", "Hurricane", "Extreme Rain", "Heatwave", "Drought", "Severe Storm",
    ],
    EventCategory.HUMANITARIAN: [
        "Displacement", "Food Crisis", "Humanitarian Emergency",
    ],
    EventCategory.CYBER: [
        "Cyber Attack", "Ransomware", "Infrastructure Attack", "Internet Outage",
    ],
    EventCategory.INFRASTRUCTURE: [
        "Power Failure", "Transport Disruption", "Port Disruption", "Industrial Accident",
    ],
    EventCategory.SUPPLY_CHAIN: [
        "Shipping Disruption", "Port Closure", "Canal Disruption", "Logistics Disruption",
    ],
    EventCategory.ECONOMIC: [
        "Market Shock", "Commodity Shock", "Oil Shock", "Currency Crisis",
    ],
    EventCategory.HEALTH: [
        "Disease Outbreak", "Public Health Emergency",
    ],
    EventCategory.OTHER: ["Other"],
}


class SeverityLevel(str, Enum):
    MINIMAL = "MINIMAL"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


def classify_risk(score: float) -> SeverityLevel:
    if score <= 20:
        return SeverityLevel.MINIMAL
    if score <= 40:
        return SeverityLevel.LOW
    if score <= 60:
        return SeverityLevel.MODERATE
    if score <= 80:
        return SeverityLevel.HIGH
    return SeverityLevel.CRITICAL


class RelationshipType(str, Enum):
    CAUSES = "CAUSES"
    ESCALATES = "ESCALATES"
    AFFECTS = "AFFECTS"
    CORRELATED_WITH = "CORRELATED_WITH"
    NEARBY = "NEARBY"
    SUPPLY_CHAIN_IMPACT = "SUPPLY_CHAIN_IMPACT"
    ECONOMIC_IMPACT = "ECONOMIC_IMPACT"
    INFRASTRUCTURE_IMPACT = "INFRASTRUCTURE_IMPACT"


class RelationshipEvidence(str, Enum):
    OBSERVED = "OBSERVED"
    INFERRED = "INFERRED"
    SCENARIO = "SCENARIO"


REGIONS = [
    "North America", "South America", "Europe", "Africa",
    "Middle East", "Asia", "Oceania",
]

CONTINENT_BY_REGION = {
    "North America": "North America",
    "South America": "South America",
    "Europe": "Europe",
    "Africa": "Africa",
    "Middle East": "Asia",
    "Asia": "Asia",
    "Oceania": "Oceania",
}
