"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalMap, type MapToggles } from "@/components/map/GlobalMap";
import { MapControls, type MapFilterState } from "@/components/map/MapControls";
import { EventDrawer } from "@/components/map/EventDrawer";
import { KPIRow } from "@/components/dashboard/KPIRow";
import { TopDevelopments } from "@/components/dashboard/TopDevelopments";
import { RegionalRisk } from "@/components/dashboard/RegionalRisk";
import { RiskTrendChart } from "@/components/charts/RiskTrendChart";
import { CrisisTimeline } from "@/components/charts/CrisisTimeline";
import { EventList } from "@/components/events/EventList";
import { api } from "@/lib/api";
import type { EventListItem, EventCategory, GlobalRiskOut, RegionRiskOut, SeverityLevel, TopDevelopment } from "@/lib/types";

const ALL_CATEGORIES: EventCategory[] = [
  "GEOPOLITICAL", "NATURAL_DISASTER", "WEATHER", "CYBER",
  "INFRASTRUCTURE", "ECONOMIC", "HEALTH", "SUPPLY_CHAIN",
];
const ALL_SEVERITIES: SeverityLevel[] = ["CRITICAL", "HIGH", "MODERATE", "LOW"];

export default function DashboardPage() {
  const [filters, setFilters] = useState<MapFilterState>({
    categories: new Set(ALL_CATEGORIES),
    severities: new Set(ALL_SEVERITIES),
    timeRange: "30d",
  });
  const [toggles, setToggles] = useState<MapToggles>({
    heatmap: false, populationExposure: false, riskZones: false, connections: false,
  });
  const [allEvents, setAllEvents] = useState<EventListItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [globalRisk, setGlobalRisk] = useState<GlobalRiskOut | null>(null);
  const [regions, setRegions] = useState<RegionRiskOut[]>([]);
  const [topDev, setTopDev] = useState<TopDevelopment[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    setLoadingEvents(true);
    api
      .eventsForMap({ time_range: filters.timeRange })
      .then(setAllEvents)
      .catch(() => setAllEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [filters.timeRange]);

  async function refreshSummary() {
    setLoadingSummary(true);
    try {
      const [risk, regionRows, dev] = await Promise.all([
        api.globalRisk(), api.regionalRisk(), api.topDevelopments(6),
      ]);
      setGlobalRisk(risk);
      setRegions(regionRows);
      setTopDev(dev);
    } catch {
      // dashboard keeps showing last-known values on transient failure
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    refreshSummary();
    const interval = setInterval(refreshSummary, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = useMemo(
    () =>
      allEvents.filter(
        (e) => filters.categories.has(e.event_category) && filters.severities.has(e.severity_level)
      ),
    [allEvents, filters.categories, filters.severities]
  );

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        <KPIRow risk={globalRisk} loading={loadingSummary} />

        <CrisisTimeline value={filters.timeRange} onChange={(v) => setFilters((f) => ({ ...f, timeRange: v }))} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="relative h-[560px] overflow-hidden rounded-lg border border-border xl:col-span-3">
            <GlobalMap events={filteredEvents} toggles={toggles} onSelectEvent={setSelectedEventId} />
            <MapControls filters={filters} onFiltersChange={setFilters} toggles={toggles} onTogglesChange={setToggles} />
            <EventDrawer eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
          </div>
          <div className="h-[560px] xl:col-span-1">
            <EventList events={filteredEvents} loading={loadingEvents} onSelect={setSelectedEventId} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TopDevelopments items={topDev} loading={loadingSummary} />
          <RegionalRisk regions={regions} loading={loadingSummary} />
        </div>

        <RiskTrendChart />

        <p className="pb-2 text-center font-mono text-[10px] text-subtle">
          Data sources: GDACS · GDELT Cloud — AI-generated assessments are analytical summaries, not verified forecasts.
        </p>
      </div>
    </AppShell>
  );
}
