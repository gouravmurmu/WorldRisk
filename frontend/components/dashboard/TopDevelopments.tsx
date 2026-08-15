"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TopDevelopment } from "@/lib/types";
import { trendArrow } from "@/lib/utils";

export function TopDevelopments({ items, loading }: { items: TopDevelopment[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Developments</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 p-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          : items.length === 0
          ? <div className="p-3 text-[12px] text-subtle">No significant developments right now.</div>
          : items.map((item, i) => (
              <Link
                key={item.id}
                href={`/events/${item.id}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/5 transition-colors"
              >
                <span className="w-5 shrink-0 font-mono text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-gray-200">{item.title}</div>
                  <div className="text-[11px] text-subtle">{item.country}</div>
                </div>
                <div className="shrink-0 text-right font-mono text-[12px]">
                  <div className="text-gray-200">Risk {item.risk_score}</div>
                  <div className={item.pct_change >= 0 ? "text-red-400" : "text-green-400"}>
                    {trendArrow(item.trend)} {Math.abs(item.pct_change)}%
                  </div>
                </div>
              </Link>
            ))}
      </CardContent>
    </Card>
  );
}
