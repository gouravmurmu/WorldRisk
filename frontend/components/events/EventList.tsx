"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EventCard } from "./EventCard";
import type { EventListItem } from "@/lib/types";

export function EventList({
  events,
  loading,
  onSelect,
}: {
  events: EventListItem[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Event Feed</CardTitle>
        <span className="font-mono text-[11px] text-subtle">{events.length}</span>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-3 text-[12px] text-subtle">No events match the current filters.</div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {events.map((e) => (
              <EventCard key={e.id} event={e} onClick={() => onSelect(e.id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
