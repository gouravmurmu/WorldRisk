"use client";

import type { EventListItem } from "@/lib/types";
import { CATEGORY_COLOR, CATEGORY_LABEL, SEVERITY_COLOR, formatRelativeTime, trendArrow } from "@/lib/utils";

export function EventCard({ event, onClick }: { event: EventListItem; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-white/5 transition-colors"
    >
      <span
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: CATEGORY_COLOR[event.event_category] }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-gray-200">{event.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-subtle">
          <span>{CATEGORY_LABEL[event.event_category]}</span>
          <span>·</span>
          <span>{event.country}</span>
          <span>·</span>
          <span>{formatRelativeTime(event.event_date)}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-[12px] font-semibold" style={{ color: SEVERITY_COLOR[event.severity_level] }}>
          {event.risk_score}
        </div>
        <div className="font-mono text-[10px] text-subtle">{trendArrow(event.trend)}</div>
      </div>
    </button>
  );
}
