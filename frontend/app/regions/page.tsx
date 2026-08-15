"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RegionalRisk } from "@/components/dashboard/RegionalRisk";
import { api } from "@/lib/api";
import type { RegionRiskOut } from "@/lib/types";

export default function RegionsPage() {
  const [regions, setRegions] = useState<RegionRiskOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.regionalRisk().then(setRegions).catch(() => setRegions([])).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl p-4">
        <h1 className="mb-4 text-lg font-semibold text-gray-100">World Regions</h1>
        <RegionalRisk regions={regions} loading={loading} />
      </div>
    </AppShell>
  );
}
