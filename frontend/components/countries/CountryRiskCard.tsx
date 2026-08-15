"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { severityFromScore } from "@/lib/risk";

export function CountryRiskCard({
  country,
  countryCode,
  risk,
  activeEvents,
}: {
  country: string;
  countryCode: string;
  risk: number;
  activeEvents: number;
}) {
  return (
    <Link href={`/countries/${countryCode}`}>
      <Card className="flex items-center justify-between px-4 py-3 hover:border-borderStrong transition-colors">
        <div>
          <div className="text-[14px] text-gray-100">{country}</div>
          <div className="font-mono text-[11px] text-subtle">{activeEvents} active event(s)</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-semibold text-gray-100">{risk}</div>
          <SeverityBadge level={severityFromScore(risk)} />
        </div>
      </Card>
    </Link>
  );
}
