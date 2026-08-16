"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EventList } from "@/components/events/EventList";
import { EventDrawer } from "@/components/map/EventDrawer";
import { ScopedTrendChart } from "@/components/charts/ScopedTrendChart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { CountryRiskOut, EventListItem, Story } from "@/lib/types";
import { severityFromScore } from "@/lib/risk";
import { formatNumber } from "@/lib/utils";

const CATEGORY_ROWS: { key: keyof CountryRiskOut; label: string }[] = [
  { key: "geopolitical", label: "Geopolitical" },
  { key: "natural_disaster", label: "Natural Disaster" },
  { key: "weather", label: "Weather" },
  { key: "cyber", label: "Cyber" },
  { key: "economic", label: "Economic" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "humanitarian", label: "Humanitarian" },
  { key: "health", label: "Health" },
];

export default function CountryDetailPage() {
  const params = useParams<{ country: string }>();
  const router = useRouter();
  const [risk, setRisk] = useState<CountryRiskOut | null>(null);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.country) return;
    api
      .countryRisk(params.country)
      .then(setRisk)
      .catch(() => setNotFound(true));
    api.events({ country: params.country, time_range: "all", limit: 50 }).then(setEvents).catch(() => {});
  }, [params.country]);

  useEffect(() => {
    if (risk) api.stories({ region: undefined, limit: 200 }).then((rows) =>
      setStories(rows.filter((s) => s.country === risk.country).slice(0, 8))
    ).catch(() => {});
  }, [risk]);

  if (notFound) {
    return (
      <AppShell>
        <div className="flex h-full flex-col items-center justify-center gap-3 text-subtle">
          <p>No data for this country yet.</p>
          <Button onClick={() => router.push("/countries")}>Back to countries</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        <button onClick={() => router.push("/countries")} className="flex w-fit items-center gap-1.5 text-[12px] text-subtle hover:text-gray-200">
          <ArrowLeft size={13} /> Back to countries
        </button>

        {!risk ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <Card className="p-5">
            <h1 className="text-2xl font-semibold text-gray-50">{risk.country}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="font-mono text-3xl font-bold text-gray-100">{risk.national_risk}</span>
              <span className="text-subtle text-sm">/ 100</span>
              <SeverityBadge level={risk.severity_level} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 font-mono text-[12px] text-subtle">
              <span>{risk.active_events} active events</span>
              <span>~{formatNumber(risk.affected_population_estimate)} population exposure est.</span>
            </div>
          </Card>
        )}

        {risk && (
          <Card>
            <CardHeader><CardTitle>Risk by Category</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {CATEGORY_ROWS.map((row) => {
                const value = risk[row.key] as number;
                return (
                  <div key={row.key}>
                    <div className="mb-1 flex justify-between font-mono text-[11px] text-gray-300">
                      <span>{row.label}</span>
                      <span>{value}</span>
                    </div>
                    <ProgressBar value={value} color="#3B82F6" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {risk && <ScopedTrendChart country={risk.country_code} />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="relative h-[420px]">
            <EventList events={events} loading={!risk} onSelect={setSelectedEventId} />
            <EventDrawer eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
          </div>

          <Card>
            <CardHeader><CardTitle>Recent Coverage</CardTitle></CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {stories.length === 0 ? (
                <div className="py-2 text-[12px] text-subtle">No recent story coverage.</div>
              ) : (
                stories.map((s) => (
                  <div key={s.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="text-[13px] text-gray-200">{s.title}</div>
                    <div className="text-[11px] text-subtle">{s.article_count} article(s) · significance {Math.round(s.significance)}</div>
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
