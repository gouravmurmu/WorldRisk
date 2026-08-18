"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CATEGORY_LABEL, SEVERITY_COLOR } from "@/lib/utils";
import type { EventCategory, RegionRiskOut } from "@/lib/types";

export function RegionCard({ region }: { region: RegionRiskOut }) {
  return (
    <Link href={`/regions/${encodeURIComponent(region.region)}`}>
      <Card className="flex flex-col gap-3 p-4 hover:border-borderStrong transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[15px] text-gray-100">{region.region}</div>
            <div className="mt-0.5 font-mono text-[11px] text-subtle">
              {region.active_events} active event{region.active_events === 1 ? "" : "s"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xl font-semibold text-gray-100">{region.risk_score}</div>
            <SeverityBadge level={region.severity_level} />
          </div>
        </div>

        <ProgressBar value={region.risk_score} color={SEVERITY_COLOR[region.severity_level]} />

        {region.top_category && (
          <div className="font-mono text-[10px] uppercase tracking-wider text-subtle">
            Top threat: <span className="text-gray-300">{CATEGORY_LABEL[region.top_category as EventCategory] || region.top_category}</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
