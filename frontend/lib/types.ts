export type EventCategory =
  | "GEOPOLITICAL"
  | "NATURAL_DISASTER"
  | "WEATHER"
  | "HUMANITARIAN"
  | "CYBER"
  | "INFRASTRUCTURE"
  | "SUPPLY_CHAIN"
  | "ECONOMIC"
  | "HEALTH"
  | "OTHER";

export type SeverityLevel = "MINIMAL" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type EventStatus = "ACTIVE" | "MONITORING" | "RESOLVED";
export type Trend = "ESCALATING" | "STABLE" | "DE_ESCALATING";

export interface EventListItem {
  id: string;
  event_category: EventCategory;
  event_type: string;
  title: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  severity: number;
  risk_score: number;
  severity_level: SeverityLevel;
  trend: Trend;
  status: EventStatus;
  event_date: string;
}

export interface RiskComponents {
  severity: number;
  population_exposure: number;
  economic_exposure: number;
  escalation: number;
  geographic_spread: number;
  confidence: number;
  recency: number;
  partially_estimated: boolean;
  estimated_fields: string[];
}

export interface EventOut extends EventListItem {
  source: string;
  summary: string;
  radius_km: number;
  country_code: string;
  continent: string;
  admin1: string;
  confidence_score: number;
  risk_components: RiskComponents;
  detected_at: string;
  updated_at: string;
  population_exposure: number;
  economic_exposure: number;
  geographic_spread: number;
  escalation_score: number;
  has_fatalities: boolean;
  fatalities: number;
  source_url: string;

  metrics: Record<string, number>;
  timeline: TimelineEntry[];
  article: string;
}

export interface TimelineEntry {
  time: string;
  label: string;
}

export interface EventSourceOut {
  id: string;
  provider: string;
  source_url: string;
  title: string;
  publisher: string;
  published_at: string | null;
  source_type: "EVENT" | "STORY" | "SOURCE_ARTICLE";
  credibility_score: number;
}

export interface EventRelationshipOut {
  id: string;
  source_event_id: string;
  target_event_id: string;
  relationship_type: string;
  evidence: "OBSERVED" | "INFERRED" | "SCENARIO";
  reason: string;
  strength: number;
  confidence: number;
  other_event_title: string;
  other_event_category: string;
}

export interface GlobalRiskOut {
  global_risk: number;
  severity_level: SeverityLevel;
  geopolitical_risk: number;
  natural_disaster_risk: number;
  weather_risk: number;
  economic_risk: number;
  infrastructure_risk: number;
  cyber_risk: number;
  humanitarian_risk: number;
  health_risk: number;
  active_events: number;
  high_severity_events: number;
  escalating_events: number;
  affected_countries: number;
  timestamp: string;
}

export interface RegionRiskOut {
  region: string;
  risk_score: number;
  severity_level: SeverityLevel;
  active_events: number;
  top_category: string;
}

export interface CountryRiskOut {
  country: string;
  country_code: string;
  national_risk: number;
  severity_level: SeverityLevel;
  geopolitical: number;
  natural_disaster: number;
  weather: number;
  cyber: number;
  economic: number;
  infrastructure: number;
  humanitarian: number;
  health: number;
  active_events: number;
  affected_population_estimate: number;
}

export interface TopDevelopment {
  id: string;
  title: string;
  country: string;
  risk_score: number;
  trend: Trend;
  pct_change: number;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  category: string;
  country: string;
  region: string;
  significance: number;
  published_at: string;
  article_count: number;
  articles: { title: string; publisher: string; url: string; published_at: string | null }[];
}

export interface ScenarioParameters {
  conflict_intensity_pct: number;
  shipping_disruption_pct: number;
  oil_price_shock_pct: number;
  extreme_weather_pct: number;
  cyber_activity_pct: number;
}

export interface RiskDelta {
  label: string;
  before: number;
  after: number;
}

export interface ScenarioResult {
  is_simulation: boolean;
  parameters: ScenarioParameters;
  global_risk: RiskDelta;
  deltas: RiskDelta[];
  narrative: string[];
}

export interface ImpactRow {
  domain: string;
  level: "LOW" | "MEDIUM" | "HIGH";
}

export interface EvidenceItem {
  label: string;
  ref_type: "event" | "story";
  ref_id: string;
}

export interface IntelligenceResponse {
  assessment: string;
  current_risk_level: SeverityLevel;
  primary_drivers: string[];
  potential_impact: ImpactRow[];
  key_evidence: EvidenceItem[];
  confidence: number;
  note: string;
  tool_calls_made: string[];
}

export interface SystemStatus {
  demo_mode: boolean;
  ingestion: {
    timestamp: string | null;
    event_count: number;
    relationship_count?: number;
    mode?: string;
    source_breakdown: Record<string, number>;
  };
  sources: {
    gdacs: { provider: string; status: string; last_success: string | null; last_error: string | null };
    gdelt: { provider: string; status: string; last_success: string | null; last_error: string | null };
  };
  database: { status: string };
  ai_engine: { status: string };
  websocket: { status: string; active_connections: number };
}
