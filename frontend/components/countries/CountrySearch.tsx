"use client";

import { Search } from "lucide-react";

export function CountrySearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-panel2 px-3 py-2 max-w-sm">
      <Search size={14} className="text-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search countries…"
        className="w-full bg-transparent text-[13px] outline-none placeholder:text-subtle"
      />
    </div>
  );
}
