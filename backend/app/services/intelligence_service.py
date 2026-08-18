"""AI Intelligence Analyst.

The model never answers data-specific questions from parametric knowledge —
it must call backend tools (thin wrappers over `query_service`, the same
functions the REST API uses) to look up events, risk, stories, and
scenarios, then submit a structured assessment through a `submit_assessment`
tool call rather than free text. This keeps the output shape reliable and
keeps every number traceable back to a query the frontend could also run.

If no LLM_API_KEY is configured, falls back to a rule-based assessment
built directly from the same query_service functions — still fully
data-grounded, just without natural-language synthesis. The response is
labeled accordingly either way.
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.config import get_settings
from app.schemas.intelligence import EvidenceItem, ImpactRow, IntelligenceResponse
from app.schemas.scenario import ScenarioParameters
from app.services import query_service, risk_service, scenario_service
from app.services.normalization_service import COUNTRY_NAMES
from app.taxonomy import REGIONS, EventCategory

logger = logging.getLogger("gci.intelligence")

MAX_TOOL_ITERATIONS = 6

TOOLS = [
    {
        "name": "get_active_events",
        "description": "List current crisis events, optionally filtered by category, region, country, or severity. Returns id, title, category, country, risk_score, trend.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "One of GEOPOLITICAL, NATURAL_DISASTER, WEATHER, HUMANITARIAN, CYBER, INFRASTRUCTURE, SUPPLY_CHAIN, ECONOMIC, HEALTH"},
                "region": {"type": "string"},
                "country_code": {"type": "string", "description": "ISO2 country code"},
                "limit": {"type": "integer", "default": 15},
            },
        },
    },
    {
        "name": "get_event_details",
        "description": "Get full detail for a single event by id, including risk component breakdown.",
        "input_schema": {"type": "object", "properties": {"event_id": {"type": "string"}}, "required": ["event_id"]},
    },
    {
        "name": "get_regional_risk",
        "description": "Get risk scores for all world regions, ranked highest first.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_country_risk",
        "description": "Get the national risk breakdown for one country by ISO2 code.",
        "input_schema": {"type": "object", "properties": {"country_code": {"type": "string"}}, "required": ["country_code"]},
    },
    {
        "name": "get_recent_stories",
        "description": "Get recent news stories (evidence bundles), optionally filtered by category/region. Distinct from verified events.",
        "input_schema": {
            "type": "object",
            "properties": {"category": {"type": "string"}, "region": {"type": "string"}, "limit": {"type": "integer", "default": 10}},
        },
    },
    {
        "name": "get_historical_trend",
        "description": "Get a risk trend time series for a metric (global, geopolitical, natural_disaster, weather, cyber, economic, infrastructure, health, humanitarian) over N days.",
        "input_schema": {
            "type": "object",
            "properties": {"metric": {"type": "string", "default": "global"}, "days": {"type": "integer", "default": 90}},
        },
    },
    {
        "name": "find_related_events",
        "description": "Find events related to a given event id, with relationship type and whether it's OBSERVED, INFERRED, or SCENARIO.",
        "input_schema": {"type": "object", "properties": {"event_id": {"type": "string"}}, "required": ["event_id"]},
    },
    {
        "name": "simulate_scenario",
        "description": "Run a deterministic what-if scenario simulation with percentage parameter changes. Not a forecast.",
        "input_schema": {
            "type": "object",
            "properties": {
                "conflict_intensity_pct": {"type": "number", "default": 0},
                "shipping_disruption_pct": {"type": "number", "default": 0},
                "oil_price_shock_pct": {"type": "number", "default": 0},
                "extreme_weather_pct": {"type": "number", "default": 0},
                "cyber_activity_pct": {"type": "number", "default": 0},
            },
        },
    },
    {
        "name": "submit_assessment",
        "description": "Submit the final structured intelligence assessment. Call this exactly once, after gathering enough evidence with the other tools.",
        "input_schema": {
            "type": "object",
            "properties": {
                "assessment": {"type": "string", "description": "2-4 sentence current-situation summary"},
                "current_risk_level": {"type": "string", "enum": ["MINIMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"]},
                "primary_drivers": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
                "potential_impact": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"domain": {"type": "string"}, "level": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"]}},
                        "required": ["domain", "level"],
                    },
                },
                "key_evidence": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"label": {"type": "string"}, "ref_type": {"type": "string", "enum": ["event", "story"]}, "ref_id": {"type": "string"}},
                        "required": ["label", "ref_type", "ref_id"],
                    },
                },
                "confidence": {"type": "number", "description": "0-100"},
            },
            "required": ["assessment", "current_risk_level", "primary_drivers", "potential_impact", "key_evidence", "confidence"],
        },
    },
]

SYSTEM_PROMPT = (
    "You are the Intelligence Analyst inside Global Crisis Intelligence, a crisis-monitoring "
    "dashboard. You MUST call the provided tools to look up real current data before answering "
    "any question about events, risk, regions, countries, or trends — never invent statistics, "
    "event names, or risk scores. Call get_active_events / get_regional_risk / get_country_risk / "
    "get_recent_stories / get_historical_trend / find_related_events / simulate_scenario as needed "
    "(you may call several in sequence), then call submit_assessment exactly once with your final "
    "structured answer, grounded only in what the tools returned. Distinguish OBSERVED facts from "
    "INFERRED relationships. Cite specific event or story ids in key_evidence."
)


def _json_default(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)


def _dispatch_tool(db: Session, name: str, tool_input: dict) -> dict:
    if name == "get_active_events":
        rows = query_service.list_events(
            db, category=tool_input.get("category"), region=tool_input.get("region"),
            country_code=tool_input.get("country_code"), limit=tool_input.get("limit", 15),
        )
        return {"events": [
            {"id": e.id, "title": e.title, "category": e.event_category, "country": e.country,
             "risk_score": e.risk_score, "trend": e.trend, "status": e.status}
            for e in rows
        ]}
    if name == "get_event_details":
        ev = query_service.get_event(db, tool_input["event_id"])
        if not ev:
            return {"error": "not_found"}
        return {
            "id": ev.id, "title": ev.title, "summary": ev.summary, "category": ev.event_category,
            "country": ev.country, "risk_score": ev.risk_score, "risk_components": ev.risk_components,
            "trend": ev.trend, "status": ev.status, "fatalities": ev.fatalities,
        }
    if name == "get_regional_risk":
        return {"regions": query_service.regional_risk_table(db)}
    if name == "get_country_risk":
        result = query_service.country_risk(db, tool_input["country_code"])
        return result or {"error": "no_data"}
    if name == "get_recent_stories":
        return {"stories": query_service.recent_stories(
            db, category=tool_input.get("category"), region=tool_input.get("region"),
            limit=tool_input.get("limit", 10),
        )}
    if name == "get_historical_trend":
        return {"series": query_service.historical_trend(
            db, category_key=f"{tool_input.get('metric', 'global')}_risk" if tool_input.get("metric", "global") != "global" else "global_risk",
            days=tool_input.get("days", 90),
        )}
    if name == "find_related_events":
        return {"relationships": query_service.get_relationships_for_event(db, tool_input["event_id"])}
    if name == "simulate_scenario":
        params = ScenarioParameters(**{k: v for k, v in tool_input.items() if k in ScenarioParameters.model_fields})
        return scenario_service.simulate(db, params).model_dump()
    return {"error": f"unknown_tool:{name}"}


# Keyword -> one or more taxonomy categories. Matched as a case-insensitive
# substring against the question, so "risks to global energy supply" hits
# both ECONOMIC and SUPPLY_CHAIN.
_CATEGORY_KEYWORDS: dict[str, list[EventCategory]] = {
    "energy": [EventCategory.ECONOMIC, EventCategory.SUPPLY_CHAIN],
    "oil": [EventCategory.ECONOMIC, EventCategory.SUPPLY_CHAIN],
    "fuel": [EventCategory.ECONOMIC, EventCategory.SUPPLY_CHAIN],
    "shipping": [EventCategory.SUPPLY_CHAIN],
    "port": [EventCategory.SUPPLY_CHAIN],
    "supply chain": [EventCategory.SUPPLY_CHAIN],
    "logistics": [EventCategory.SUPPLY_CHAIN],
    "cyber": [EventCategory.CYBER],
    "hack": [EventCategory.CYBER],
    "ransomware": [EventCategory.CYBER],
    "health": [EventCategory.HEALTH],
    "disease": [EventCategory.HEALTH],
    "outbreak": [EventCategory.HEALTH],
    "pandemic": [EventCategory.HEALTH],
    "conflict": [EventCategory.GEOPOLITICAL],
    "war": [EventCategory.GEOPOLITICAL],
    "military": [EventCategory.GEOPOLITICAL],
    "geopolitic": [EventCategory.GEOPOLITICAL],
    "protest": [EventCategory.GEOPOLITICAL],
    "unrest": [EventCategory.GEOPOLITICAL],
    "terror": [EventCategory.GEOPOLITICAL],
    "weather": [EventCategory.WEATHER],
    "storm": [EventCategory.WEATHER],
    "cyclone": [EventCategory.WEATHER],
    "hurricane": [EventCategory.WEATHER],
    "flood": [EventCategory.NATURAL_DISASTER],
    "earthquake": [EventCategory.NATURAL_DISASTER],
    "volcano": [EventCategory.NATURAL_DISASTER],
    "wildfire": [EventCategory.NATURAL_DISASTER],
    "tsunami": [EventCategory.NATURAL_DISASTER],
    "humanitarian": [EventCategory.HUMANITARIAN],
    "displacement": [EventCategory.HUMANITARIAN],
    "refugee": [EventCategory.HUMANITARIAN],
    "famine": [EventCategory.HUMANITARIAN],
    "infrastructure": [EventCategory.INFRASTRUCTURE],
    "power grid": [EventCategory.INFRASTRUCTURE],
    "power outage": [EventCategory.INFRASTRUCTURE],
    "economic": [EventCategory.ECONOMIC],
    "market": [EventCategory.ECONOMIC],
    "currency": [EventCategory.ECONOMIC],
    "inflation": [EventCategory.ECONOMIC],
}

# Longest country name first so "South Korea" matches before a shorter,
# accidental substring would.
_COUNTRY_NAME_TO_CODE = dict(
    sorted(((name.lower(), code) for code, name in COUNTRY_NAMES.items()), key=lambda kv: -len(kv[0]))
)


def _detect_scope(question: str) -> dict:
    q = question.lower()
    region = next((r for r in REGIONS if r.lower() in q), None)
    country_code = next((code for name, code in _COUNTRY_NAME_TO_CODE.items() if name in q), None)
    categories: list[EventCategory] = []
    for keyword, cats in _CATEGORY_KEYWORDS.items():
        if keyword in q:
            for cat in cats:
                if cat not in categories:
                    categories.append(cat)
    return {"region": region, "country_code": country_code, "categories": categories}


def _drivers_and_evidence(events: list, limit: int = 3) -> tuple[list[str], list[EvidenceItem]]:
    top = sorted(events, key=lambda e: e.risk_score, reverse=True)[:limit]
    drivers = [f"{e.title} ({e.country}) — risk {e.risk_score}" for e in top]
    evidence = [EvidenceItem(label=e.title, ref_type="event", ref_id=e.id) for e in top]
    return drivers, evidence


def _country_scoped_answer(db: Session, country_code: str) -> IntelligenceResponse:
    risk = query_service.country_risk(db, country_code)
    events = query_service.list_events(db, country_code=country_code, limit=10)
    if not risk:
        return IntelligenceResponse(
            assessment=(
                f"No tracked events are currently associated with that country in the live dataset — "
                f"either it's genuinely quiet right now, or it's outside the current demo coverage."
            ),
            current_risk_level="MINIMAL", primary_drivers=[], potential_impact=[], key_evidence=[],
            confidence=30.0, tool_calls_made=["get_country_risk"],
        )
    drivers, evidence = _drivers_and_evidence(events)
    impact = [
        ImpactRow(domain=label, level="HIGH" if risk[key] >= 61 else "MEDIUM" if risk[key] >= 41 else "LOW")
        for key, label in [("geopolitical", "Geopolitical"), ("economic", "Economic"), ("infrastructure", "Infrastructure")]
    ]
    return IntelligenceResponse(
        assessment=(
            f"{risk['country']} currently has a national risk score of {risk['national_risk']}/100 "
            f"({risk['severity_level']}) across {risk['active_events']} active tracked event(s). "
            f"This is a rule-based summary built directly from live dashboard data, not natural-language analysis."
        ),
        current_risk_level=risk["severity_level"],
        primary_drivers=drivers or ["No significant active events currently tracked for this country."],
        potential_impact=impact, key_evidence=evidence,
        confidence=70.0 if events else 40.0,
        tool_calls_made=["get_country_risk", "get_active_events"],
    )


def _region_scoped_answer(db: Session, region: str) -> IntelligenceResponse:
    regions = query_service.regional_risk_table(db)
    entry = next((r for r in regions if r["region"] == region), None)
    events = query_service.list_events(db, region=region, limit=10)
    drivers, evidence = _drivers_and_evidence(events)
    impact = [
        ImpactRow(domain=r["region"], level="HIGH" if r["risk_score"] >= 61 else "MEDIUM" if r["risk_score"] >= 41 else "LOW")
        for r in regions if r["region"] != region
    ][:4]
    risk_score = entry["risk_score"] if entry else 0.0
    return IntelligenceResponse(
        assessment=(
            f"{region} currently shows a regional risk score of {risk_score}/100 "
            f"({entry['severity_level'] if entry else 'MINIMAL'}) across {entry['active_events'] if entry else 0} "
            f"active tracked event(s), most commonly {entry['top_category'].replace('_', ' ').title() if entry and entry['top_category'] else 'mixed categories'}. "
            f"This is a rule-based summary built directly from live dashboard data, not natural-language analysis."
        ),
        current_risk_level=risk_service.severity_level(risk_score).value,
        primary_drivers=drivers or [f"No significant active events currently tracked in {region}."],
        potential_impact=impact, key_evidence=evidence,
        confidence=70.0 if events else 40.0,
        tool_calls_made=["get_regional_risk", "get_active_events"],
    )


def _category_scoped_answer(db: Session, categories: list[EventCategory]) -> IntelligenceResponse:
    events: list = []
    for cat in categories:
        events.extend(query_service.list_events(db, category=cat.value, limit=10))
    drivers, evidence = _drivers_and_evidence(events, limit=4)
    country_risk_by_country: dict[str, float] = {}
    for e in events:
        country_risk_by_country[e.country] = max(country_risk_by_country.get(e.country, 0), e.risk_score)
    impact = [
        ImpactRow(domain=country, level="HIGH" if score >= 61 else "MEDIUM" if score >= 41 else "LOW")
        for country, score in sorted(country_risk_by_country.items(), key=lambda kv: -kv[1])[:4]
    ]
    label = " / ".join(c.value.replace("_", " ").title() for c in categories)
    avg_score = round(sum(e.risk_score for e in events) / len(events), 1) if events else 0.0
    return IntelligenceResponse(
        assessment=(
            f"Tracking {len(events)} active event(s) related to {label}, averaging a risk score of {avg_score}/100. "
            f"This is a rule-based summary built directly from live dashboard data, not natural-language analysis."
        ),
        current_risk_level=risk_service.severity_level(avg_score).value,
        primary_drivers=drivers or [f"No significant active {label} events currently tracked."],
        potential_impact=impact, key_evidence=evidence,
        confidence=65.0 if events else 35.0,
        tool_calls_made=["get_active_events"],
    )


def _global_scoped_answer(db: Session) -> IntelligenceResponse:
    global_risk = query_service.global_risk(db)
    top = query_service.top_developments(db, limit=5)
    regions = query_service.regional_risk_table(db)[:3]

    drivers = [f"{d['title']} ({d['country']}) — risk {d['risk_score']}" for d in top[:3]]
    impact = [ImpactRow(domain=r["region"], level="HIGH" if r["risk_score"] >= 61 else "MEDIUM" if r["risk_score"] >= 41 else "LOW") for r in regions]
    evidence = [EvidenceItem(label=d["title"], ref_type="event", ref_id=d["id"]) for d in top[:3]]

    return IntelligenceResponse(
        assessment=(
            f"Global risk is currently {global_risk['severity_level']} at {global_risk['global_risk']}/100 "
            f"across {global_risk['active_events']} active events in {global_risk['affected_countries']} countries. "
            f"This is a rule-based summary (no LLM_API_KEY configured) built directly from live dashboard data, "
            f"not a natural-language analysis."
        ),
        current_risk_level=global_risk["severity_level"],
        primary_drivers=drivers or ["No significant active events."],
        potential_impact=impact,
        key_evidence=evidence,
        confidence=60.0,
        tool_calls_made=["get_active_events", "get_regional_risk"],
    )


def _rule_based_fallback(db: Session, question: str) -> IntelligenceResponse:
    """No LLM key configured — build a grounded, if less fluent, assessment
    directly from the query layer. Routes on keywords detected in the
    question (country / region / category) instead of always returning the
    same global summary, so different questions actually get different,
    still fully data-grounded, answers.
    """
    scope = _detect_scope(question)
    if scope["country_code"]:
        return _country_scoped_answer(db, scope["country_code"])
    if scope["region"]:
        return _region_scoped_answer(db, scope["region"])
    if scope["categories"]:
        return _category_scoped_answer(db, scope["categories"])
    return _global_scoped_answer(db)


async def ask(db: Session, question: str) -> IntelligenceResponse:
    settings = get_settings()
    if not settings.llm_api_key:
        return _rule_based_fallback(db, question)

    try:
        import anthropic
    except ImportError:
        logger.warning("anthropic package not installed — using rule-based fallback")
        return _rule_based_fallback(db, question)

    client = anthropic.AsyncAnthropic(api_key=settings.llm_api_key)
    messages: list[dict] = [{"role": "user", "content": question}]
    tool_calls_made: list[str] = []

    for _ in range(MAX_TOOL_ITERATIONS):
        response = await client.messages.create(
            model=settings.llm_model,
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        tool_uses = [b for b in response.content if b.type == "tool_use"]
        if not tool_uses:
            break

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        submitted: dict | None = None

        for block in tool_uses:
            tool_calls_made.append(block.name)
            if block.name == "submit_assessment":
                submitted = block.input
                tool_results.append({
                    "type": "tool_result", "tool_use_id": block.id, "content": "Assessment received.",
                })
                continue
            try:
                result = _dispatch_tool(db, block.name, block.input)
            except Exception as exc:
                result = {"error": str(exc)}
            tool_results.append({
                "type": "tool_result", "tool_use_id": block.id,
                "content": json.dumps(result, default=_json_default),
            })

        if submitted is not None:
            return IntelligenceResponse(
                assessment=submitted["assessment"],
                current_risk_level=submitted["current_risk_level"],
                primary_drivers=submitted["primary_drivers"],
                potential_impact=[ImpactRow(**i) for i in submitted["potential_impact"]],
                key_evidence=[EvidenceItem(**e) for e in submitted["key_evidence"]],
                confidence=float(submitted["confidence"]),
                tool_calls_made=tool_calls_made,
            )

        messages.append({"role": "user", "content": tool_results})

    logger.warning("Intelligence analyst hit max tool iterations without submit_assessment")
    fallback = _rule_based_fallback(db, question)
    fallback.tool_calls_made = tool_calls_made
    return fallback
