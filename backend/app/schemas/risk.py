from datetime import datetime

from pydantic import BaseModel


class GlobalRiskOut(BaseModel):
    global_risk: float
    severity_level: str
    geopolitical_risk: float
    natural_disaster_risk: float
    weather_risk: float
    economic_risk: float
    infrastructure_risk: float
    cyber_risk: float
    humanitarian_risk: float
    health_risk: float
    active_events: int
    high_severity_events: int
    escalating_events: int
    affected_countries: int
    timestamp: datetime


class RegionRiskOut(BaseModel):
    region: str
    risk_score: float
    severity_level: str
    active_events: int
    top_category: str


class CountryRiskOut(BaseModel):
    country: str
    country_code: str
    national_risk: float
    severity_level: str
    geopolitical: float
    natural_disaster: float
    weather: float
    cyber: float
    economic: float
    infrastructure: float
    humanitarian: float
    health: float
    active_events: int
    affected_population_estimate: float
