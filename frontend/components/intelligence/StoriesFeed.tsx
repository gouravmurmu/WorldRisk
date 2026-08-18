"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { Story, EventCategory } from "@/lib/types";
import { CATEGORY_COLOR, CATEGORY_LABEL, formatRelativeTime } from "@/lib/utils";

const ALL_CATEGORIES = Object.keys(CATEGORY_COLOR) as EventCategory[];

/**
 * Browsable evidence feed — stories are event+source bundles, distinct from
 * a verified CrisisEvent (see backend query_service.recent_stories). This
 * replaced the Intelligence Graph: the graph looked good but didn't give
 * users anything they couldn't already see faster on an event's own Related
 * Events panel. This gives them something to actually browse and click into,
 * and it's the same evidence pool the AI Analyst cites in key_evidence.
 */
export function StoriesFeed() {
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [stories, setStories] = useState<Story[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setStories(null);
    api.stories({ category: category || undefined, limit: 20 }).then(setStories).catch(() => setStories([]));
  }, [category]);

  return (
    <Card>
      <CardHeader className="flex-wrap gap-2">
        <CardTitle>Live Evidence &amp; Stories</CardTitle>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setCategory(null)}
            className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide border ${
              category === null ? "border-accent text-accent bg-accent/10" : "border-border text-subtle hover:text-gray-300"
            }`}
          >
            All
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide border"
              style={
                category === cat
                  ? { borderColor: CATEGORY_COLOR[cat], color: CATEGORY_COLOR[cat], backgroundColor: `${CATEGORY_COLOR[cat]}1A` }
                  : { borderColor: "rgba(255,255,255,0.08)", color: "#5B6472" }
              }
            >
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex max-h-[520px] flex-col gap-1 overflow-y-auto p-2">
        {stories === null ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : stories.length === 0 ? (
          <div className="p-3 text-[12px] text-subtle">No stories match this filter yet.</div>
        ) : (
          stories.map((s) => {
            const expanded = expandedId === s.id;
            return (
              <div key={s.id} className="rounded-md px-2.5 py-2 hover:bg-white/5">
                <button onClick={() => setExpandedId(expanded ? null : s.id)} className="flex w-full items-start gap-2 text-left">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR[s.category as EventCategory] || "#6B7280" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded border border-border px-1 font-mono text-[9px] uppercase text-subtle">Story</span>
                      <span className="font-mono text-[10px] text-subtle">{s.article_count} source(s)</span>
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-gray-200">{s.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-subtle">
                      <span>{s.country}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(s.published_at)}</span>
                      <span>·</span>
                      <span>significance {Math.round(s.significance)}</span>
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={14} className="mt-1 shrink-0 text-subtle" /> : <ChevronDown size={14} className="mt-1 shrink-0 text-subtle" />}
                </button>

                {expanded && (
                  <div className="ml-4 mt-2 flex flex-col gap-2 border-l border-border pl-3">
                    <p className="text-[12px] leading-relaxed text-gray-400">{s.summary}</p>
                    {s.articles.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="font-mono text-[9px] uppercase tracking-widest text-subtle">Source Articles</div>
                        {s.articles.map((a, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] text-gray-300">{a.publisher}: {a.title}</span>
                            {a.url && (
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-subtle hover:text-accent">
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <Link href={`/events/${s.id.replace("story-", "")}`} className="w-fit font-mono text-[11px] text-accent hover:underline">
                      View underlying event →
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
