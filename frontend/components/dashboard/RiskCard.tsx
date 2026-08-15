"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export function RiskCard({
  label,
  value,
  suffix,
  color,
  loading,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card className="px-4 py-3 flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <motion.span
          key={String(value)}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={cn("font-mono text-2xl font-semibold tabular-nums")}
          style={color ? { color } : undefined}
        >
          {value}
          {suffix && <span className="text-sm text-subtle font-normal">{suffix}</span>}
        </motion.span>
      )}
    </Card>
  );
}
