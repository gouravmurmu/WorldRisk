"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { ScenarioResult as ScenarioResultType } from "@/lib/types";
import { severityFromScore } from "@/lib/risk";
import { SEVERITY_COLOR } from "@/lib/utils";

export function ScenarioResult({ result }: { result: ScenarioResultType | null }) {
  if (!result) {
    return (
      <Card>
        <CardHeader><CardTitle>Scenario Result</CardTitle></CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-[12px] text-subtle">
          Adjust parameters and run a simulation to see projected impact.
        </CardContent>
      </Card>
    );
  }

  const rows = [result.global_risk, ...result.deltas];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Result</CardTitle>
        <span className="rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-yellow-400">
          Simulation
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-[13px] text-gray-300">{row.label}</span>
            <motion.div
              key={`${row.label}-${row.after}`}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-mono text-[14px]"
            >
              <span className="text-subtle">{row.before}</span>
              <span className="text-subtle">→</span>
              <span style={{ color: SEVERITY_COLOR[severityFromScore(row.after)] }} className="font-semibold">
                {row.after}
              </span>
            </motion.div>
          </div>
        ))}

        <div className="border-t border-border pt-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-subtle">Narrative</div>
          <ul className="flex flex-col gap-1.5 text-[12px] text-gray-400">
            {result.narrative.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
