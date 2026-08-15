"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ScenarioParameters } from "@/lib/types";

const SLIDERS: { key: keyof ScenarioParameters; label: string }[] = [
  { key: "conflict_intensity_pct", label: "Conflict Intensity" },
  { key: "shipping_disruption_pct", label: "Shipping Disruption" },
  { key: "oil_price_shock_pct", label: "Oil Price Shock" },
  { key: "extreme_weather_pct", label: "Extreme Weather" },
  { key: "cyber_activity_pct", label: "Cyber Activity" },
];

export function ScenarioBuilder({
  params,
  onChange,
  onRun,
  loading,
}: {
  params: ScenarioParameters;
  onChange: (p: ScenarioParameters) => void;
  onRun: () => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Builder</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] text-gray-300">{s.label}</span>
              <span className="font-mono text-[12px] text-accent">
                {params[s.key] > 0 ? "+" : ""}{params[s.key]}%
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={150}
              step={5}
              value={params[s.key]}
              onChange={(e) => onChange({ ...params, [s.key]: Number(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
        ))}

        <Button variant="accent" onClick={onRun} disabled={loading} className="w-full">
          {loading ? "Simulating…" : "Run Simulation"}
        </Button>
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-yellow-500/80">
          Simulation — Not a Forecast
        </p>
      </CardContent>
    </Card>
  );
}
