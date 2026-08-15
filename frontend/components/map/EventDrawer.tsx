"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import type { EventOut } from "@/lib/types";
import { CATEGORY_COLOR, CATEGORY_LABEL, SEVERITY_COLOR, trendArrow } from "@/lib/utils";
import { SeverityBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export function EventDrawer({ eventId, onClose }: { eventId: string | null; onClose: () => void }) {
  const [event, setEvent] = useState<EventOut | null>(null);

  useEffect(() => {
    if (!eventId) return;
    setEvent(null);
    api.event(eventId).then(setEvent).catch(() => setEvent(null));
  }, [eventId]);

  return (
    <AnimatePresence>
      {eventId && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute right-3 top-3 bottom-3 z-20 w-[340px] overflow-y-auto rounded-lg border border-border bg-panel2/95 backdrop-blur shadow-panel"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Event Intelligence</span>
            <button onClick={onClose} aria-label="Close" className="text-subtle hover:text-gray-200">
              <X size={15} />
            </button>
          </div>

          {!event ? (
            <div className="p-4 flex flex-col gap-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-4">
              <div>
                <span
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: CATEGORY_COLOR[event.event_category] }}
                >
                  {CATEGORY_LABEL[event.event_category]} · {event.event_type}
                </span>
                <h2 className="mt-1 text-[16px] font-semibold leading-snug text-gray-50">{event.title}</h2>
                <div className="mt-0.5 text-[12px] text-muted">{event.country}</div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-panel px-3 py-2">
                <SeverityBadge level={event.severity_level} />
                <span className="font-mono text-xl font-bold" style={{ color: SEVERITY_COLOR[event.severity_level] }}>
                  {event.risk_score}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <Metric label="Population Exposure" value={levelWord(event.population_exposure)} />
                <Metric label="Economic Exposure" value={levelWord(event.economic_exposure)} />
                <Metric label="Confidence" value={`${Math.round(event.confidence_score)}%`} />
                <Metric label="Fatalities" value={event.has_fatalities ? String(event.fatalities) : "—"} />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-subtle">Status</span>
                <span className="font-mono text-[11px] text-gray-300">● {event.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-subtle">Trend</span>
                <span className="font-mono text-[11px] text-gray-300">
                  {trendArrow(event.trend)} {event.trend}
                </span>
              </div>

              <p className="text-[12px] leading-relaxed text-gray-400">{event.summary}</p>

              <Link href={`/events/${event.id}`}>
                <Button variant="accent" className="w-full">View Full Intelligence</Button>
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function levelWord(v: number): string {
  if (v >= 70) return "HIGH";
  if (v >= 35) return "MODERATE";
  return "LOW";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-panel px-2 py-1.5">
      <div className="text-subtle text-[9px] uppercase tracking-wider">{label}</div>
      <div className="text-gray-200 text-[13px] mt-0.5">{value}</div>
    </div>
  );
}
