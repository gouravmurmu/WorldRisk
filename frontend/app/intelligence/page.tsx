import { AppShell } from "@/components/layout/AppShell";
import { AIAnalyst } from "@/components/intelligence/AIAnalyst";
import { IntelligenceGraph } from "@/components/intelligence/IntelligenceGraph";

export default function IntelligencePage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <h1 className="text-lg font-semibold text-gray-100">Intelligence</h1>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AIAnalyst />
          <IntelligenceGraph />
        </div>
      </div>
    </AppShell>
  );
}
