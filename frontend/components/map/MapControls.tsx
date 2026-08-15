"use client";

import { CATEGORY_COLOR, CATEGORY_LABEL, SEVERITY_COLOR } from "@/lib/utils";
import type { EventCategory, SeverityLevel } from "@/lib/types";
import type { MapToggles } from "./GlobalMap";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const ALL_CATEGORIES = Object.keys(CATEGORY_COLOR) as EventCategory[];
const ALL_SEVERITIES: SeverityLevel[] = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
const TIME_RANGES = [
  { label: "24H", value: "24h" },
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

export interface MapFilterState {
  categories: Set<EventCategory>;
  severities: Set<SeverityLevel>;
  timeRange: string;
}

export function MapControls({
  filters,
  onFiltersChange,
  toggles,
  onTogglesChange,
}: {
  filters: MapFilterState;
  onFiltersChange: (f: MapFilterState) => void;
  toggles: MapToggles;
  onTogglesChange: (t: MapToggles) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  function toggleCategory(cat: EventCategory) {
    const next = new Set(filters.categories);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    onFiltersChange({ ...filters, categories: next });
  }
  function toggleSeverity(sev: SeverityLevel) {
    const next = new Set(filters.severities);
    next.has(sev) ? next.delete(sev) : next.add(sev);
    onFiltersChange({ ...filters, severities: next });
  }

  return (
    <div className="absolute left-3 top-3 z-10 w-60 rounded-lg border border-border bg-panel/95 backdrop-blur shadow-panel">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted"
      >
        Map Controls
        {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </button>

      {!collapsed && (
        <div className="max-h-[70vh] overflow-y-auto px-3 pb-3 flex flex-col gap-3">
          <Section title="Event Types">
            {ALL_CATEGORIES.map((cat) => (
              <CheckRow
                key={cat}
                checked={filters.categories.has(cat)}
                onChange={() => toggleCategory(cat)}
                color={CATEGORY_COLOR[cat]}
                label={CATEGORY_LABEL[cat]}
              />
            ))}
          </Section>

          <Section title="Severity">
            {ALL_SEVERITIES.map((sev) => (
              <CheckRow
                key={sev}
                checked={filters.severities.has(sev)}
                onChange={() => toggleSeverity(sev)}
                color={SEVERITY_COLOR[sev]}
                label={sev}
              />
            ))}
          </Section>

          <Section title="Time">
            <div className="flex flex-wrap gap-1.5">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.value}
                  onClick={() => onFiltersChange({ ...filters, timeRange: tr.value })}
                  className={`rounded px-2 py-1 font-mono text-[10px] border ${
                    filters.timeRange === tr.value
                      ? "border-accent text-accent bg-accent/10"
                      : "border-border text-muted hover:text-gray-200"
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Layers">
            <CheckRow checked={toggles.heatmap} onChange={() => onTogglesChange({ ...toggles, heatmap: !toggles.heatmap })} label="Heatmap" />
            <CheckRow checked={toggles.populationExposure} onChange={() => onTogglesChange({ ...toggles, populationExposure: !toggles.populationExposure })} label="Population exposure" />
            <CheckRow checked={toggles.riskZones} onChange={() => onTogglesChange({ ...toggles, riskZones: !toggles.riskZones })} label="Risk zones" />
            <CheckRow checked={toggles.connections} onChange={() => onTogglesChange({ ...toggles, connections: !toggles.connections })} label="Event connections" />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-subtle">{title}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  color,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  color?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-gray-300 hover:text-gray-100">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-accent h-3.5 w-3.5" />
      {color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
      {label}
    </label>
  );
}
