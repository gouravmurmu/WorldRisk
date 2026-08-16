"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CountryCompareColumn } from "@/components/countries/CountryCompareColumn";
import { api } from "@/lib/api";
import type { CountryRiskOut } from "@/lib/types";

interface CountryOption {
  country: string;
  country_code: string;
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeA = searchParams.get("a") || "";
  const codeB = searchParams.get("b") || "";

  const [options, setOptions] = useState<CountryOption[]>([]);
  const [dataA, setDataA] = useState<CountryRiskOut | null>(null);
  const [dataB, setDataB] = useState<CountryRiskOut | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  useEffect(() => {
    api.countries().then((rows) => setOptions(rows as CountryOption[])).catch(() => setOptions([]));
  }, []);

  useEffect(() => {
    if (!codeA) { setDataA(null); return; }
    setLoadingA(true);
    api.countryRisk(codeA).then(setDataA).catch(() => setDataA(null)).finally(() => setLoadingA(false));
  }, [codeA]);

  useEffect(() => {
    if (!codeB) { setDataB(null); return; }
    setLoadingB(true);
    api.countryRisk(codeB).then(setDataB).catch(() => setDataB(null)).finally(() => setLoadingB(false));
  }, [codeB]);

  function setParam(key: "a" | "b", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/countries/compare?${params.toString()}`);
  }

  function swap() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", codeB);
    params.set("b", codeA);
    router.push(`/countries/compare?${params.toString()}`);
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
        <Link href="/countries" className="flex w-fit items-center gap-1.5 text-[12px] text-subtle hover:text-gray-200">
          <ArrowLeft size={13} /> Back to countries
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-100">Country Comparison</h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={codeA}
            onChange={(e) => setParam("a", e.target.value)}
            className="flex-1 rounded-md border border-border bg-panel2 px-3 py-2 text-[13px] text-gray-200"
          >
            <option value="">Select country A…</option>
            {options.map((o) => (
              <option key={o.country_code} value={o.country_code}>{o.country}</option>
            ))}
          </select>

          <button
            onClick={swap}
            disabled={!codeA && !codeB}
            className="shrink-0 rounded-md border border-border p-2 text-subtle hover:text-gray-200 disabled:opacity-30"
            aria-label="Swap countries"
          >
            <ArrowLeftRight size={15} />
          </button>

          <select
            value={codeB}
            onChange={(e) => setParam("b", e.target.value)}
            className="flex-1 rounded-md border border-border bg-panel2 px-3 py-2 text-[13px] text-gray-200"
          >
            <option value="">Select country B…</option>
            {options.map((o) => (
              <option key={o.country_code} value={o.country_code}>{o.country}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CountryCompareColumn data={dataA} loading={loadingA} otherRisk={dataB?.national_risk} />
          <CountryCompareColumn data={dataB} loading={loadingB} otherRisk={dataA?.national_risk} />
        </div>
      </div>
    </AppShell>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareContent />
    </Suspense>
  );
}
