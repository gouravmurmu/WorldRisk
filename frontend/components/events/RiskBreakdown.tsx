"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { RiskComponents } from "@/lib/types";

const ROWS: { key: keyof RiskComponents; label: string; weight: string }[] = [
  { key: "severity", label: "Severity", weight: "25%" },
  { key: "population_exposure", label: "Population Exposure", weight: "20%" },
  { key: "economic_exposure", label: "Economic Exposure", weight: "15%" },
  { key: "escalation", label: "Escalation", weight: "15%" },
  { key: "geographic_spread", label: "Geographic Spread", weight: "10%" },
  { key: "confidence", label: "Confidence", weight: "10%" },
  { key: "recency", label: "Recency", weight: "5%" },
];

export function RiskBreakdown({ riskScore, components }: { riskScore: number; components: RiskComponents }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Score Breakdown</CardTitle>
        <span className="font-mono text-lg font-bold text-gray-100">{riskScore}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ROWS.map((row) => (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
              <span className="text-gray-300">
                {row.label} <span className="text-subtle">({row.weight})</span>
              </span>
              <span className="text-gray-200">{components[row.key] as number}</span>
            </div>
            <ProgressBar value={components[row.key] as number} color="#3B82F6" />
          </div>
        ))}
        {components.partially_estimated && (
          <p className="mt-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1.5 text-[11px] text-yellow-400">
            Partially estimated — {components.estimated_fields.join(", ")} could not be sourced directly and
            were inferred.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
