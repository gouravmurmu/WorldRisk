"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { EventSourceOut } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export function SourceList({ sources }: { sources: EventSourceOut[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence</CardTitle>
        <span className="font-mono text-[11px] text-subtle">{sources.length} source(s)</span>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {sources.length === 0 ? (
          <div className="py-2 text-[12px] text-subtle">No linked sources for this event.</div>
        ) : (
          sources.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="rounded border border-border px-1 font-mono text-[9px] uppercase text-subtle">
                    {s.source_type.replace("_", " ")}
                  </span>
                  <span className="text-[11px] text-subtle">{s.publisher}</span>
                </div>
                <div className="mt-0.5 truncate text-[13px] text-gray-200">{s.title || "Untitled"}</div>
                <div className="text-[11px] text-subtle">{formatRelativeTime(s.published_at)} · credibility {Math.round(s.credibility_score)}%</div>
              </div>
              {s.source_url && (
                <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-subtle hover:text-accent">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
