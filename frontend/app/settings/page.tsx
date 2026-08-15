"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import type { SystemStatus } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    api.systemStatus().then(setStatus).catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <h1 className="text-lg font-semibold text-gray-100">Settings &amp; System Status</h1>

        <Card>
          <CardHeader><CardTitle>Data Sources</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 font-mono text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Mode</span>
              <span className="text-gray-200">{status?.demo_mode ? "DEMO MODE" : "LIVE"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">GDACS</span>
              {status ? <StatusDot status={status.sources.gdacs.status} /> : <span className="text-subtle">—</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">GDELT Cloud</span>
              {status ? <StatusDot status={status.sources.gdelt.status} /> : <span className="text-subtle">—</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Last ingestion cycle</span>
              <span className="text-gray-200">{formatRelativeTime(status?.ingestion.timestamp)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">AI Engine</span>
              {status ? <StatusDot status={status.ai_engine.status} /> : <span className="text-subtle">—</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Attribution</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-[13px] text-gray-300">
            <p>
              Disaster data: <a className="text-accent hover:underline" href="https://www.gdacs.org" target="_blank" rel="noreferrer">GDACS</a> — Global Disaster Alert and Coordination System.
            </p>
            <p>
              News &amp; geopolitical intelligence: <a className="text-accent hover:underline" href="https://docs.gdeltcloud.com" target="_blank" rel="noreferrer">GDELT Cloud API v2</a>.
            </p>
            <p>Basemap tiles: CARTO Dark Matter, © OpenStreetMap contributors.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Limitations</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-[13px] text-gray-400">
            <p>Risk scores are analytical heuristics, not measured ground truth.</p>
            <p>AI assessments are analytical summaries generated from live dashboard data — not verified forecasts.</p>
            <p>External source data (GDACS/GDELT) can be delayed, incomplete, or temporarily unavailable; the dashboard falls back to the last cached state or demo data when that happens.</p>
            <p>Inferred event relationships describe plausible propagation, not confirmed causal claims.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
