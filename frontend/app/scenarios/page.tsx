"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ScenarioBuilder } from "@/components/scenarios/ScenarioBuilder";
import { ScenarioResult } from "@/components/scenarios/ScenarioResult";
import { api } from "@/lib/api";
import type { ScenarioParameters, ScenarioResult as ScenarioResultType } from "@/lib/types";

const DEFAULT_PARAMS: ScenarioParameters = {
  conflict_intensity_pct: 0,
  shipping_disruption_pct: 0,
  oil_price_shock_pct: 0,
  extreme_weather_pct: 0,
  cyber_activity_pct: 0,
};

export default function ScenariosPage() {
  const [params, setParams] = useState<ScenarioParameters>(DEFAULT_PARAMS);
  const [result, setResult] = useState<ScenarioResultType | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await api.simulateScenario(params);
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
        <h1 className="text-lg font-semibold text-gray-100">Scenario Simulator</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ScenarioBuilder params={params} onChange={setParams} onRun={run} loading={loading} />
          <ScenarioResult result={result} />
        </div>
      </div>
    </AppShell>
  );
}
