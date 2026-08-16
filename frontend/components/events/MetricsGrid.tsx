"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { metricLabel, formatMetricValue } from "@/lib/utils";

export function MetricsGrid({ metrics }: { metrics: Record<string, number> }) {
  const entries = Object.entries(metrics);
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Metrics</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded border border-border bg-panel px-3 py-2.5">
            <div className="font-mono text-[9px] uppercase tracking-wider text-subtle">{metricLabel(key)}</div>
            <div className="mt-1 font-mono text-lg text-gray-100">{formatMetricValue(key, value)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
