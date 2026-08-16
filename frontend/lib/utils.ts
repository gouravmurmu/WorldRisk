import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { EventCategory, SeverityLevel } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_COLOR: Record<EventCategory, string> = {
  GEOPOLITICAL: "#EF4444",
  NATURAL_DISASTER: "#F97316",
  WEATHER: "#3B82F6",
  CYBER: "#A855F7",
  INFRASTRUCTURE: "#EAB308",
  SUPPLY_CHAIN: "#14B8A6",
  ECONOMIC: "#22C55E",
  HEALTH: "#EC4899",
  HUMANITARIAN: "#F59E0B",
  OTHER: "#6B7280",
};

export const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  MINIMAL: "#4B5563",
  LOW: "#3B82F6",
  MODERATE: "#EAB308",
  HIGH: "#F97316",
  CRITICAL: "#EF4444",
};

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  GEOPOLITICAL: "Geopolitical",
  NATURAL_DISASTER: "Natural Disaster",
  WEATHER: "Weather",
  CYBER: "Cyber",
  INFRASTRUCTURE: "Infrastructure",
  SUPPLY_CHAIN: "Supply Chain",
  ECONOMIC: "Economic",
  HEALTH: "Health",
  HUMANITARIAN: "Humanitarian",
  OTHER: "Other",
};

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toString();
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function formatUTCTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")} UTC`;
}

const METRIC_LABELS: Record<string, string> = {
  magnitude: "Magnitude", depth_km: "Depth (km)", wave_height_m: "Wave Height (m)",
  ash_altitude_km: "Ash Altitude (km)", water_level_m: "Water Level (m)",
  displaced_estimate: "Displaced (est.)", area_burned_hectares: "Area Burned (ha)",
  containment_pct: "Containment", blocked_routes: "Routes Blocked",
  wind_speed_kmh: "Wind Speed (km/h)", pressure_hpa: "Pressure (hPa)",
  rainfall_mm_24h: "Rainfall, 24h (mm)", peak_temp_c: "Peak Temp (°C)",
  duration_months: "Duration (months)", wind_gust_kmh: "Wind Gust (km/h)",
  people_in_need: "People in Need", systems_affected: "Systems Affected",
  organizations_affected: "Organizations Affected", facilities_targeted: "Facilities Targeted",
  users_affected_millions: "Users Affected (M)", duration_hours: "Duration (hours)",
  households_affected: "Households Affected", routes_affected: "Routes Affected",
  delay_hours: "Delay (hours)", vessels_delayed: "Vessels Delayed", injuries: "Injuries",
  vessels_affected: "Vessels Affected", delay_days: "Delay (days)",
  cargo_volume_impacted_pct: "Cargo Volume Impacted", transit_delay_days: "Transit Delay (days)",
  shipments_delayed: "Shipments Delayed", index_change_pct: "Index Change",
  price_change_pct: "Price Change", currency_change_pct: "Currency Change",
  casualties_estimate: "Casualties (est.)", forces_deployed_estimate: "Forces Deployed (est.)",
  protest_size_estimate: "Protest Size (est.)", cases_reported: "Cases Reported",
  case_fatality_rate_pct: "Case Fatality Rate", affected_population: "Affected Population",
};

export function metricLabel(key: string): string {
  return METRIC_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMetricValue(key: string, value: number): string {
  if (key.endsWith("_pct")) {
    return key.endsWith("change_pct") ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : `${value.toFixed(0)}%`;
  }
  return value.toLocaleString();
}

export function trendArrow(trend: string): string {
  if (trend === "ESCALATING") return "↑";
  if (trend === "DE_ESCALATING") return "↓";
  return "→";
}
