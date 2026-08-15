"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalMap } from "@/components/map/GlobalMap";
import { EventList } from "@/components/events/EventList";
import { EventDrawer } from "@/components/map/EventDrawer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { EventListItem, RegionRiskOut } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/utils";

export default function RegionDetailPage() {
  const params = useParams<{ region: string }>();
  const router = useRouter();
  const regionName = decodeURIComponent(params.region || "");

  const [regionSummary, setRegionSummary] = useState<RegionRiskOut | null>(null);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!regionName) return;
    setLoading(true);
    Promise.all([
      api.regionalRisk(),
      api.events({ region: regionName, time_range: "all", limit: 300 }),
    ])
      .then(([regions, evs]) => {
        setRegionSummary(regions.find((r) => r.region === regionName) || null);
        setEvents(evs);
      })
      .finally(() => setLoading(false));
  }, [regionName]);

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => (counts[e.event_category] = (counts[e.event_category] || 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <button onClick={() => router.push("/regions")} className="flex w-fit items-center gap-1.5 text-[12px] text-subtle hover:text-gray-200">
          <ArrowLeft size={13} /> Back to regions
        </button>

        <Card className="p-5">
          <h1 className="text-2xl font-semibold text-gray-50">{regionName}</h1>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-40" />
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <span className="font-mono text-3xl font-bold text-gray-100">{regionSummary?.risk_score ?? "—"}</span>
              <span className="text-subtle text-sm">/ 100</span>
              {regionSummary && <SeverityBadge level={regionSummary.severity_level} />}
              <span className="ml-4 font-mono text-[11px] text-subtle">{events.length} events tracked</span>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="relative h-[420px] overflow-hidden rounded-lg border border-border xl:col-span-3">
            <GlobalMap
              events={events}
              toggles={{ heatmap: false, populationExposure: false, riskZones: false, connections: false }}
              onSelectEvent={setSelectedEventId}
            />
            <EventDrawer eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
          </div>
          <div className="h-[420px] xl:col-span-1">
            <EventList events={events} loading={loading} onSelect={setSelectedEventId} />
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Category Mix</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {categoryBreakdown.length === 0 ? (
              <span className="text-[12px] text-subtle">No events in this region for the selected window.</span>
            ) : (
              categoryBreakdown.map(([cat, count]) => (
                <span key={cat} className="rounded border border-border px-2 py-1 font-mono text-[11px] text-gray-300">
                  {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] || cat}: {count}
                </span>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
