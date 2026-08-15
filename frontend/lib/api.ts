const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText} for ${path}`);
  }
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  health: () => request<{ status: string; demo_mode: boolean }>("/api/health"),

  events: (params: {
    category?: string; severity?: string; region?: string; country?: string;
    status?: string; time_range?: string; search?: string; limit?: number;
  } = {}) => request<import("./types").EventListItem[]>(`/api/events${qs(params)}`),

  eventsForMap: (params: { category?: string; severity?: string; time_range?: string } = {}) =>
    request<import("./types").EventListItem[]>(`/api/events/map${qs(params)}`),

  relationshipGraph: (limit = 25) =>
    request<{
      nodes: { id: string; title: string; category: string; country: string; risk_score: number }[];
      edges: { source: string; target: string; relationship_type: string; evidence: string; strength: number }[];
    }>(`/api/events/graph/top${qs({ limit })}`),

  event: (id: string) => request<import("./types").EventOut>(`/api/events/${id}`),
  eventSources: (id: string) => request<import("./types").EventSourceOut[]>(`/api/events/${id}/sources`),
  eventRelationships: (id: string) => request<import("./types").EventRelationshipOut[]>(`/api/events/${id}/relationships`),

  globalRisk: () => request<import("./types").GlobalRiskOut>("/api/risk/global"),
  regionalRisk: () => request<import("./types").RegionRiskOut[]>("/api/risk/regions"),
  countries: () => request<{ country: string; country_code: string; national_risk: number; severity_level: string; active_events: number }[]>("/api/risk/countries"),
  countryRisk: (code: string) => request<import("./types").CountryRiskOut>(`/api/risk/countries/${code}`),
  topDevelopments: (limit = 6) => request<import("./types").TopDevelopment[]>(`/api/risk/top-developments${qs({ limit })}`),

  stories: (params: { category?: string; region?: string; limit?: number } = {}) =>
    request<import("./types").Story[]>(`/api/stories${qs(params)}`),

  history: (days = 30) => request<any>(`/api/history${qs({ days })}`),
  historyTrends: (metric = "global", days = 90) => request<{ timestamp: string; value: number }[]>(`/api/history/trends${qs({ metric, days })}`),

  simulateScenario: (params: import("./types").ScenarioParameters) =>
    request<import("./types").ScenarioResult>("/api/scenarios/simulate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  askIntelligence: (question: string) =>
    request<import("./types").IntelligenceResponse>("/api/intelligence/query", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  systemStatus: () => request<import("./types").SystemStatus>("/api/system/status"),
};

export { API_URL };
