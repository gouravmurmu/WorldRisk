from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RiskComponents(BaseModel):
    severity: float
    population_exposure: float
    economic_exposure: float
    escalation: float
    geographic_spread: float
    confidence: float
    recency: float
    partially_estimated: bool = False
    estimated_fields: list[str] = []


class EventSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    source_url: str
    title: str
    publisher: str
    published_at: datetime | None
    source_type: str
    credibility_score: float


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: str
    event_type: str
    event_category: str
    title: str
    summary: str

    latitude: float
    longitude: float
    radius_km: float

    country: str
    country_code: str
    region: str
    continent: str
    admin1: str

    severity: float
    risk_score: float
    severity_level: str
    confidence_score: float
    risk_components: dict

    event_date: datetime
    detected_at: datetime
    updated_at: datetime

    population_exposure: float
    economic_exposure: float
    geographic_spread: float
    escalation_score: float

    has_fatalities: bool
    fatalities: int

    status: str
    trend: str

    source_url: str


class EventListItem(BaseModel):
    """Slim projection used for map/list rendering (hundreds of rows)."""

    id: str
    event_category: str
    event_type: str
    title: str
    country: str
    region: str
    latitude: float
    longitude: float
    severity: float
    risk_score: float
    severity_level: str
    trend: str
    status: str
    event_date: datetime


class EventRelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_event_id: str
    target_event_id: str
    relationship_type: str
    evidence: str
    reason: str
    strength: float
    confidence: float
    other_event_title: str = ""
    other_event_category: str = ""
