"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { RegionRiskOut } from "@/lib/types";
import { SEVERITY_COLOR } from "@/lib/utils";

export function RegionalRisk({ regions, loading }: { regions: RegionRiskOut[]; loading: boolean }) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regional Risk</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
          : regions.map((r) => (
              <button
                key={r.region}
                onClick={() => router.push(`/regions/${encodeURIComponent(r.region)}`)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-gray-300 group-hover:text-white">{r.region}</span>
                  <span className="font-mono text-[12px] text-gray-300">{r.risk_score}</span>
                </div>
                <ProgressBar value={r.risk_score} color={SEVERITY_COLOR[r.severity_level]} />
              </button>
            ))}
      </CardContent>
    </Card>
  );
}
