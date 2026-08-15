import type { SeverityLevel } from "./types";

export function severityFromScore(score: number): SeverityLevel {
  if (score <= 20) return "MINIMAL";
  if (score <= 40) return "LOW";
  if (score <= 60) return "MODERATE";
  if (score <= 80) return "HIGH";
  return "CRITICAL";
}
