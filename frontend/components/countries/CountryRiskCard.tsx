"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { severityFromScore } from "@/lib/risk";
import { CATEGORY_LABEL } from "@/lib/utils";
import type { EventCategory } from "@/lib/types";

export function CountryRiskCard({
  country,
  countryCode,
  risk,
  activeEvents,
  topCategory,
  escalatingCount,
}: {
  country: string;
  countryCode: string;
  risk: number;
  activeEvents: number;
  topCategory?: string;
  escalatingCount?: number;
}) {
  return (
    <Link href={`/countries/${countryCode}`}>
      <Card className="flex flex-col gap-2 px-4 py-3 hover:border-borderStrong transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[14px] text-gray-100">{country}</div>
            <div className="font-mono text-[11px] text-subtle">{activeEvents} active event(s)</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold text-gray-100">{risk}</div>
            <SeverityBadge level={severityFromScore(risk)} />
          </div>
        </div>

        {(topCategory || !!escalatingCount) && (
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-subtle">
            {topCategory && <span>Top: {CATEGORY_LABEL[topCategory as EventCategory] || topCategory}</span>}
            {!!escalatingCount && <span className="text-red-400">↑ {escalatingCount} escalating</span>}
          </div>
        )}
      </Card>
    </Link>
  );
}
