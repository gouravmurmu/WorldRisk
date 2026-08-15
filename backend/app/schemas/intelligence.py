from pydantic import BaseModel


class IntelligenceQuery(BaseModel):
    question: str
    conversation_id: str | None = None


class ImpactRow(BaseModel):
    domain: str
    level: str  # LOW | MEDIUM | HIGH


class EvidenceItem(BaseModel):
    label: str
    ref_type: str  # event | story
    ref_id: str


class IntelligenceResponse(BaseModel):
    assessment: str
    current_risk_level: str
    primary_drivers: list[str]
    potential_impact: list[ImpactRow]
    key_evidence: list[EvidenceItem]
    confidence: float
    note: str = (
        "This assessment is AI-generated from available event and source data. "
        "It is analytical, not a verified forecast."
    )
    tool_calls_made: list[str] = []
