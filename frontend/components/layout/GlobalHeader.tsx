"use client";

import Link from "next/link";
import { Radar } from "lucide-react";
import { LiveIndicator } from "./LiveIndicator";
import { SystemStatus } from "./SystemStatus";
import { GlobalSearch } from "./GlobalSearch";
import { formatUTCTime } from "@/lib/utils";

export function GlobalHeader({ connected, lastUpdated, demoMode }: { connected: boolean; lastUpdated: string | null; demoMode: boolean }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-panel px-4">
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
        <Radar size={18} className="text-accent" strokeWidth={1.75} />
        <span className="font-mono text-[13px] font-semibold tracking-widest text-gray-100">
          GLOBAL CRISIS INTELLIGENCE
        </span>
      </Link>

      {demoMode && (
        <span className="hidden lg:inline-flex rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-yellow-400">
          Demo Mode
        </span>
      )}

      <div className="flex items-center gap-3 shrink-0">
        <LiveIndicator connected={connected} />
        <span className="hidden sm:inline font-mono text-[11px] text-subtle">
          Last updated: {formatUTCTime(lastUpdated)}
        </span>
      </div>

      <div className="flex-1 flex justify-center">
        <GlobalSearch />
      </div>

      <div className="shrink-0">
        <SystemStatus />
      </div>
    </header>
  );
}
