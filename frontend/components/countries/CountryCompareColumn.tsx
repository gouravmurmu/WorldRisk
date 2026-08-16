"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatNumber } from "@/lib/utils";
import type { CountryRiskOut } from "@/lib/types";

const CATEGORY_ROWS: { key: keyof CountryRiskOut; label: string }[] = [
  { key: "geopolitical", label: "Geopolitical" },
  { key: "natural_disaster", label: "Natural Disaster" },
  { key: "weather", label: "Weather" },
  { key: "cyber", label: "Cyber" },
  { key: "economic", label: "Economic" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "humanitarian", label: "Humanitarian" },
  { key: "health", label: "Health" },
];

interface Props {
  data: CountryRiskOut | null;
  loading: boolean;
  otherRisk?: number;
}

export function CountryCompareColumn({ data, loading, otherRisk }: Props) {
  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="flex h-full items-center justify-center p-6 text-[13px] text-subtle">
        Select a country to compare.
      </Card>
    );
  }

  const delta = otherRisk !== undefined ? data.national_risk - otherRisk : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.country}</CardTitle>
        <SeverityBadge level={data.severity_level} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold text-gray-100">{data.national_risk}</span>
          <span className="text-subtle text-sm">/ 100</span>
          {delta !== null && delta !== 0 && (
            <span className={`ml-auto font-mono text-[12px] ${delta > 0 ? "text-red-400" : "text-green-400"}`}>
              {delta > 0 ? "+" : ""}{delta.toFixed(1)} vs. other
            </span>
          )}
        </div>

        <div className="font-mono text-[11px] text-subtle">
          {data.active_events} active events · ~{formatNumber(data.affected_population_estimate)} population exposure est.
        </div>

        <div className="flex flex-col gap-3">
          {CATEGORY_ROWS.map((row) => {
            const value = data[row.key] as number;
            return (
              <div key={row.key}>
                <div className="mb-1 flex justify-between font-mono text-[11px] text-gray-300">
                  <span>{row.label}</span>
                  <span>{value}</span>
                </div>
                <ProgressBar value={value} color="#3B82F6" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
