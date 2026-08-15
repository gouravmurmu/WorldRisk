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

export function trendArrow(trend: string): string {
  if (trend === "ESCALATING") return "↑";
  if (trend === "DE_ESCALATING") return "↓";
  return "→";
}
