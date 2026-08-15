"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

const METRICS = [
  { key: "global", label: "Global" },
  { key: "geopolitical", label: "Geopolitical" },
  { key: "natural_disaster", label: "Natural Disaster" },
  { key: "weather", label: "Weather" },
  { key: "cyber", label: "Cyber" },
  { key: "economic", label: "Economic" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "health", label: "Health" },
];

export function RiskTrendChart() {
  const [metric, setMetric] = useState("global");
  const [data, setData] = useState<{ timestamp: string; value: number }[] | null>(null);

  useEffect(() => {
    setData(null);
    api.historyTrends(metric, 90).then(setData).catch(() => setData([]));
  }, [metric]);

  const chartData = (data || []).map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.value,
  }));

  return (
    <Card>
      <CardHeader className="flex-wrap gap-2">
        <CardTitle>Crisis Trend — 90 Days</CardTitle>
        <div className="flex flex-wrap gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide border ${
                metric === m.key ? "border-accent text-accent bg-accent/10" : "border-border text-subtle hover:text-gray-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <Skeleton className="h-56 w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-[12px] text-subtle">
            Not enough history yet — snapshots accumulate as the ingestion scheduler runs.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#5B6472", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis domain={[0, 100]} tick={{ fill: "#5B6472", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: "#11151A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#8A93A3" }}
              />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#riskFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
