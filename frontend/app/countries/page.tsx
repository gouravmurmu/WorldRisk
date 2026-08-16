"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CountrySearch } from "@/components/countries/CountrySearch";
import { CountryRiskCard } from "@/components/countries/CountryRiskCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface CountryRow {
  country: string;
  country_code: string;
  national_risk: number;
  active_events: number;
}

export default function CountriesPage() {
  const [countries, setCountries] = useState<CountryRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.countries().then((rows) => setCountries(rows as CountryRow[])).catch(() => setCountries([]));
  }, []);

  const filtered = useMemo(
    () => (countries || []).filter((c) => c.country.toLowerCase().includes(query.toLowerCase())),
    [countries, query]
  );

  return (
    <AppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-gray-100">Country Intelligence</h1>
          <div className="flex items-center gap-2">
            <CountrySearch value={query} onChange={setQuery} />
            <Link href="/countries/compare">
              <Button variant="default"><ArrowLeftRight size={12} /> Compare</Button>
            </Link>
          </div>
        </div>

        {countries === null ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-subtle">No countries match &quot;{query}&quot;.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CountryRiskCard
                key={c.country_code}
                country={c.country}
                countryCode={c.country_code}
                risk={c.national_risk}
                activeEvents={c.active_events}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
