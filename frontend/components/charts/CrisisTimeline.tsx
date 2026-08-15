"use client";

const PRESETS = [
  { label: "24 Hours", value: "24h" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
];

export function CrisisTimeline({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-subtle shrink-0">Timeline</span>
      <div className="flex flex-1 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`flex-1 rounded px-2 py-1.5 font-mono text-[11px] transition-colors ${
              value === p.value ? "bg-accent/15 text-accent border border-accent/40" : "text-muted hover:text-gray-200 border border-transparent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
