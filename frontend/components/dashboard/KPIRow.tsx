"use client";

import { RiskCard } from "./RiskCard";
import type { GlobalRiskOut } from "@/lib/types";
import { SEVERITY_COLOR } from "@/lib/utils";

export function KPIRow({ risk, loading }: { risk: GlobalRiskOut | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <RiskCard
        label="Global Risk"
        value={risk ? risk.global_risk : "—"}
        suffix="/100"
        color={risk ? SEVERITY_COLOR[risk.severity_level] : undefined}
        loading={loading}
      />
      <RiskCard label="Active Events" value={risk ? risk.active_events : "—"} loading={loading} />
      <RiskCard label="High Severity" value={risk ? risk.high_severity_events : "—"} color="#F97316" loading={loading} />
      <RiskCard label="Escalating" value={risk ? risk.escalating_events : "—"} color="#EF4444" loading={loading} />
      <RiskCard label="Affected Countries" value={risk ? risk.affected_countries : "—"} loading={loading} />
    </div>
  );
}
