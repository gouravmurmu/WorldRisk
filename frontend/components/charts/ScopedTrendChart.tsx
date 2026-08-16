"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

/**
 * Risk trend scoped to one region or country. Unlike the global trend chart,
 * region/country snapshots only ever carry the single aggregate score (see
 * backend query_service.historical_trend), so there's no per-category
 * metric switcher here — just the one line.
 */
export function ScopedTrendChart({
  region,
  country,
  days = 90,
}: {
  region?: string;
  country?: string;
  days?: number;
}) {
  const [data, setData] = useState<{ timestamp: string; value: number }[] | null>(null);

  useEffect(() => {
    setData(null);
    api
      .historyTrends("global", days, { region, country })
      .then(setData)
      .catch(() => setData([]));
  }, [region, country, days]);

  const chartData = (data || []).map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Trend — {days} Days</CardTitle>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <Skeleton className="h-48 w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-[12px] text-subtle">
            Not enough history yet — snapshots accumulate as the ingestion scheduler runs.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={192}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scopedRiskFill" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#scopedRiskFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
