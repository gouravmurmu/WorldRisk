import { cn } from "@/lib/utils";
import type { SeverityLevel } from "@/lib/types";
import { SEVERITY_COLOR } from "@/lib/utils";

export function Badge({
  children,
  className,
  color,
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider border",
        className
      )}
      style={
        color
          ? { color, borderColor: `${color}55`, backgroundColor: `${color}14` }
          : undefined
      }
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ level }: { level: SeverityLevel }) {
  return <Badge color={SEVERITY_COLOR[level]}>{level}</Badge>;
}

export function StatusDot({ status }: { status: string }) {
  const color =
    status === "LIVE" || status === "HEALTHY" || status === "READY" || status === "CONNECTED" || status === "ACTIVE"
      ? "#22C55E"
      : status === "DEGRADED" || status === "MONITORING"
      ? "#EAB308"
      : status === "UNCONFIGURED" || status === "DEMO_ONLY"
      ? "#6B7280"
      : "#EF4444";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}
