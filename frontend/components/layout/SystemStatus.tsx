"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { api } from "@/lib/api";
import type { SystemStatus as SystemStatusType } from "@/lib/types";
import { StatusDot } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";

export function SystemStatus() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SystemStatusType | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => api.systemStatus().then((s) => mounted && setStatus(s)).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted hover:text-gray-200 hover:bg-white/5 transition-colors"
        aria-label="System status"
      >
        <Activity size={14} />
        <span className="font-mono text-[10px] uppercase tracking-wider hidden sm:inline">
          {status?.demo_mode ? "Demo Mode" : "Status"}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-72 rounded-lg border border-border bg-panel2 shadow-panel p-3 font-mono text-[11px]">
          <div className="text-muted uppercase tracking-widest text-[10px] mb-2">System Status</div>
          {!status ? (
            <div className="text-subtle">Loading…</div>
          ) : (
            <div className="flex flex-col gap-2">
              <Row label="GDACS" node={<StatusDot status={status.sources.gdacs.status} />} sub={`updated ${formatRelativeTime(status.sources.gdacs.last_success)}`} />
              <Row label="GDELT" node={<StatusDot status={status.sources.gdelt.status} />} sub={`updated ${formatRelativeTime(status.sources.gdelt.last_success)}`} />
              <Row label="Database" node={<StatusDot status={status.database.status} />} />
              <Row label="AI Engine" node={<StatusDot status={status.ai_engine.status} />} />
              <Row label="WebSocket" node={<StatusDot status={status.websocket.status} />} sub={`${status.websocket.active_connections} connection(s)`} />
              <div className="pt-2 border-t border-border text-subtle">
                {status.ingestion.event_count} events · mode {status.ingestion.mode || "—"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, node, sub }: { label: string; node: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">{label}</span>
      <div className="flex flex-col items-end">
        {node}
        {sub && <span className="text-subtle text-[9px]">{sub}</span>}
      </div>
    </div>
  );
}
