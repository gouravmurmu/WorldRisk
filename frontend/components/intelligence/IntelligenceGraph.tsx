"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { CATEGORY_COLOR } from "@/lib/utils";
import type { EventCategory } from "@/lib/types";

interface GraphNode {
  id: string; title: string; category: string; country: string; risk_score: number;
  x: number; y: number;
}
interface GraphEdge {
  source: string; target: string; relationship_type: string; evidence: string; strength: number;
}

const WIDTH = 640;
const HEIGHT = 480;

export function IntelligenceGraph() {
  const [raw, setRaw] = useState<{ nodes: any[]; edges: GraphEdge[] } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    api.relationshipGraph(22).then(setRaw).catch(() => setRaw({ nodes: [], edges: [] }));
  }, []);

  const nodes: GraphNode[] = useMemo(() => {
    if (!raw) return [];
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const radius = Math.min(WIDTH, HEIGHT) / 2 - 60;
    return raw.nodes.map((n, i) => {
      const angle = (i / Math.max(1, raw.nodes.length)) * Math.PI * 2 - Math.PI / 2;
      return { ...n, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
  }, [raw]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edges = raw?.edges || [];

  const connectedIds = useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>([activeId]);
    edges.forEach((e) => {
      if (e.source === activeId) set.add(e.target);
      if (e.target === activeId) set.add(e.source);
    });
    return set;
  }, [activeId, edges]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligence Graph</CardTitle>
        <span className="font-mono text-[11px] text-subtle">{nodes.length} nodes · {edges.length} edges</span>
      </CardHeader>
      <CardContent>
        {!raw ? (
          <Skeleton className="h-[420px] w-full" />
        ) : nodes.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[12px] text-subtle">
            Not enough active events with relationships yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: 460 }}>
              {edges.map((e, i) => {
                const s = byId.get(e.source);
                const t = byId.get(e.target);
                if (!s || !t) return null;
                const dimmed = connectedIds && !(connectedIds.has(e.source) && connectedIds.has(e.target));
                return (
                  <line
                    key={i}
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke={e.evidence === "OBSERVED" ? "#3B82F6" : "#5B6472"}
                    strokeWidth={Math.max(0.6, e.strength / 40)}
                    strokeOpacity={dimmed ? 0.08 : 0.55}
                    strokeDasharray={e.evidence === "INFERRED" ? "3,3" : undefined}
                  />
                );
              })}
              {nodes.map((n) => {
                const dimmed = connectedIds && !connectedIds.has(n.id);
                const color = CATEGORY_COLOR[n.category as EventCategory] || "#6B7280";
                const r = 5 + (n.risk_score / 100) * 9;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    onMouseEnter={() => setActiveId(n.id)}
                    onMouseLeave={() => setActiveId(null)}
                    style={{ cursor: "pointer", opacity: dimmed ? 0.25 : 1 }}
                  >
                    <circle r={r} fill={color} fillOpacity={0.85} stroke="rgba(255,255,255,0.3)" />
                    <text
                      y={r + 12}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                      fill="#8A93A3"
                    >
                      {truncate(n.title, 16)}
                    </text>
                  </g>
                );
              })}
            </svg>
            {activeId && byId.get(activeId) && (
              <div className="rounded border border-border bg-panel px-3 py-2 text-[12px]">
                <Link href={`/events/${activeId}`} className="text-gray-200 hover:text-accent">
                  {byId.get(activeId)!.title}
                </Link>
                <span className="ml-2 text-subtle">{byId.get(activeId)!.country} · risk {byId.get(activeId)!.risk_score}</span>
              </div>
            )}
            <div className="flex gap-4 font-mono text-[10px] text-subtle">
              <span><span className="inline-block h-0.5 w-4 bg-accent align-middle mr-1" />Observed</span>
              <span><span className="inline-block h-0.5 w-4 border-t border-dashed border-subtle align-middle mr-1" />Inferred</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
