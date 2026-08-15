"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api";
import type { EventListItem, Story } from "@/lib/types";

interface CountryHit {
  country: string;
  country_code: string;
  national_risk: number;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [countries, setCountries] = useState<CountryHit[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setEvents([]);
      setCountries([]);
      setStories([]);
      return;
    }
    const handle = setTimeout(async () => {
      const [evs, countryList, storyList] = await Promise.all([
        api.events({ search: query, time_range: "all", limit: 5 }).catch(() => []),
        api.countries().catch(() => []),
        api.stories({ limit: 30 }).catch(() => []),
      ]);
      setEvents(evs);
      setCountries(
        countryList.filter((c) => c.country.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
      );
      setStories(
        storyList.filter((s) => s.title.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hasResults = events.length + countries.length + stories.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel2 px-2.5 py-1.5 focus-within:border-borderStrong">
        <Search size={14} className="text-subtle shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search events, countries, regions…"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-subtle"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <X size={13} className="text-subtle hover:text-gray-300" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-10 z-50 max-h-96 overflow-y-auto rounded-lg border border-border bg-panel2 shadow-panel">
          {!hasResults ? (
            <div className="p-3 text-[12px] text-subtle">No results for &quot;{query}&quot;</div>
          ) : (
            <>
              {events.length > 0 && (
                <SearchSection title="Events">
                  {events.map((e) => (
                    <SearchRow key={e.id} label={e.title} sub={e.country} onClick={() => { router.push(`/events/${e.id}`); setOpen(false); }} />
                  ))}
                </SearchSection>
              )}
              {countries.length > 0 && (
                <SearchSection title="Countries">
                  {countries.map((c) => (
                    <SearchRow key={c.country_code} label={c.country} sub={`risk ${c.national_risk}`} onClick={() => { router.push(`/countries/${c.country_code}`); setOpen(false); }} />
                  ))}
                </SearchSection>
              )}
              {stories.length > 0 && (
                <SearchSection title="Stories">
                  {stories.map((s) => (
                    <SearchRow key={s.id} label={s.title} sub={s.country} onClick={() => { router.push(`/intelligence`); setOpen(false); }} />
                  ))}
                </SearchSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-0">
      <div className="px-3 pt-2 font-mono text-[10px] uppercase tracking-widest text-subtle">{title}</div>
      <div className="pb-1">{children}</div>
    </div>
  );
}

function SearchRow({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-white/5"
    >
      <span className="truncate text-gray-200">{label}</span>
      <span className="ml-2 shrink-0 text-[11px] text-subtle">{sub}</span>
    </button>
  );
}
