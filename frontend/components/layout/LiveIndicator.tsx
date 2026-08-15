"use client";

import { cn } from "@/lib/utils";

export function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            connected && "animate-ping bg-green-500"
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            connected ? "bg-green-500" : "bg-gray-600"
          )}
        />
      </span>
      <span className={connected ? "text-green-400" : "text-gray-500"}>
        {connected ? "LIVE" : "OFFLINE"}
      </span>
    </div>
  );
}
