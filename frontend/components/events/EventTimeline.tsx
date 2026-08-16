"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatUTCTime, formatRelativeTime } from "@/lib/utils";
import type { TimelineEntry } from "@/lib/types";

export function EventTimeline({ steps }: { steps: TimelineEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {steps.length === 0 ? (
          <div className="text-[12px] text-subtle">No timeline data available.</div>
        ) : (
          steps.map((step, i) => (
            <div key={i} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="-mt-0.5 min-w-0">
                <div className="font-mono text-[11px] text-accent">
                  {formatUTCTime(step.time)} <span className="text-subtle">· {formatRelativeTime(step.time)}</span>
                </div>
                <div className="mt-0.5 text-[13px] text-gray-300">{step.label}</div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
