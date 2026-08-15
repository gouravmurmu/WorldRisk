from pydantic import BaseModel, Field


class ScenarioParameters(BaseModel):
    conflict_intensity_pct: float = Field(0, ge=-100, le=200)
    shipping_disruption_pct: float = Field(0, ge=-100, le=200)
    oil_price_shock_pct: float = Field(0, ge=-100, le=200)
    extreme_weather_pct: float = Field(0, ge=-100, le=200)
    cyber_activity_pct: float = Field(0, ge=-100, le=200)


class RiskDelta(BaseModel):
    label: str
    before: float
    after: float


class ScenarioResult(BaseModel):
    is_simulation: bool = True
    parameters: ScenarioParameters
    global_risk: RiskDelta
    deltas: list[RiskDelta]
    narrative: list[str]
