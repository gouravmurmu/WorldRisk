"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, ListTree, Globe2, Compass, BrainCircuit,
  FlaskConical, History, Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Live Map", href: "/dashboard?focus=map", icon: Map },
  { label: "Events", href: "/dashboard?focus=events", icon: ListTree },
  { label: "Countries", href: "/countries", icon: Globe2 },
  { label: "Regions", href: "/regions", icon: Compass },
  { label: "Intelligence", href: "/intelligence", icon: BrainCircuit },
  { label: "Scenarios", href: "/scenarios", icon: FlaskConical },
  { label: "History", href: "/history", icon: History },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex w-[196px] shrink-0 flex-col border-r border-border bg-panel py-4">
      <div className="flex flex-col gap-0.5 px-2">
        {NAV.map((item) => {
          const base = item.href.split("?")[0];
          const active = pathname === base;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-white/[0.06] text-white"
                  : "text-muted hover:text-gray-200 hover:bg-white/[0.03]"
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
