"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { RiskTrendChart } from "@/components/charts/RiskTrendChart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

const RANGES = [
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
  { label: "1 Year", value: 365 },
];

interface HistoryOverview {
  days: number;
  daily_series: { date: string; count: number; critical: number; avg_risk: number }[];
  total_events: number;
  top_events: { id: string; title: string; risk_score: number; country: string }[];
  country_heatmap: { country: string; count: number }[];
}

export default function HistoryPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<HistoryOverview | null>(null);

  useEffect(() => {
    setData(null);
    api.history(days).then(setData).catch(() => setData(null));
  }, [days]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-100">Historical Analysis</h1>
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`rounded px-2.5 py-1.5 font-mono text-[11px] border ${
                  days === r.value ? "border-accent text-accent bg-accent/10" : "border-border text-muted hover:text-gray-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <RiskTrendChart />

        <Card>
          <CardHeader>
            <CardTitle>Daily Event Count</CardTitle>
            {data && <span className="font-mono text-[11px] text-subtle">{data.total_events} total events</span>}
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={data.daily_series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#5B6472", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tick={{ fill: "#5B6472", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ background: "#11151A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="critical" fill="#EF4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Top Events in Window</CardTitle></CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {!data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                data.top_events.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                    <span className="truncate text-[13px] text-gray-200">{e.title}</span>
                    <span className="ml-2 shrink-0 font-mono text-[11px] text-subtle">{e.country} · {e.risk_score}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Country Activity</CardTitle></CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {!data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                data.country_heatmap.map((c) => (
                  <div key={c.country} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                    <span className="text-[13px] text-gray-200">{c.country}</span>
                    <span className="font-mono text-[11px] text-subtle">{c.count} events</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
