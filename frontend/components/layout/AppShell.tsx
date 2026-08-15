"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlobalHeader } from "./GlobalHeader";
import { Sidebar } from "./Sidebar";
import { useLiveFeed, type DataRefreshedMessage } from "@/lib/useWebSocket";
import { api } from "@/lib/api";

interface Toast {
  id: string;
  text: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const onMessage = useCallback((msg: DataRefreshedMessage) => {
    setLastUpdated(msg.timestamp);
    const id = `${msg.timestamp}-${Math.random()}`;
    setToasts((t) => [...t, { id, text: `Data refreshed — ${msg.event_count} active events (${msg.mode})` }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const { connected } = useLiveFeed(onMessage);

  useEffect(() => {
    api.health().then((h) => setDemoMode(h.demo_mode)).catch(() => {});
    api.systemStatus().then((s) => setLastUpdated(s.ingestion.timestamp)).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen flex-col bg-base">
      <GlobalHeader connected={connected} lastUpdated={lastUpdated} demoMode={demoMode} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-auto rounded-md border border-border bg-panel2 px-3 py-2 font-mono text-[11px] text-gray-200 shadow-panel"
            >
              <span className="text-green-400">●</span> {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
