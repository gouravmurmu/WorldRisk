"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { RegionCard } from "@/components/regions/RegionCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { RegionRiskOut } from "@/lib/types";
import { SEVERITY_COLOR } from "@/lib/utils";

export default function RegionsPage() {
  const [regions, setRegions] = useState<RegionRiskOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.regionalRisk().then(setRegions).catch(() => setRegions([])).finally(() => setLoading(false));
  }, []);

  const chartData = regions.map((r) => ({ region: r.region, risk: r.risk_score, color: SEVERITY_COLOR[r.severity_level] }));

  return (
    <AppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        <h1 className="text-lg font-semibold text-gray-100">World Regions</h1>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((r) => <RegionCard key={r.region} region={r} />)}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Regional Risk Comparison</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, regions.length * 34)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#5B6472", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="region" tick={{ fill: "#8A93A3", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ background: "#11151A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#8A93A3" }}
                  />
                  <Bar dataKey="risk" radius={[0, 3, 3, 0]}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
