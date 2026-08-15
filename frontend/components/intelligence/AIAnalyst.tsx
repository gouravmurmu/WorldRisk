"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { IntelligenceResponse } from "@/lib/types";
import { SEVERITY_COLOR } from "@/lib/utils";

interface Exchange {
  id: string;
  question: string;
  response: IntelligenceResponse | null;
  loading: boolean;
  error?: string;
}

const SUGGESTIONS = [
  "What are the biggest active risks in Asia?",
  "What are the biggest risks to global energy supply?",
  "Summarize escalating events in the last 7 days.",
  "Which regions have the highest humanitarian risk right now?",
];

export function AIAnalyst() {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const id = `${Date.now()}`;
    setExchanges((ex) => [{ id, question: trimmed, response: null, loading: true }, ...ex]);
    setQuestion("");
    try {
      const response = await api.askIntelligence(trimmed);
      setExchanges((ex) => ex.map((e) => (e.id === id ? { ...e, response, loading: false } : e)));
    } catch {
      setExchanges((ex) => ex.map((e) => (e.id === id ? { ...e, loading: false, error: "Query failed — try again." } : e)));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligence Analyst</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-[13px] text-gray-400">Ask a question about current global events.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); ask(question); }}
          className="flex items-center gap-2 rounded-md border border-border bg-panel2 px-3 py-2"
        >
          <span className="font-mono text-accent">{">"}</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What are the biggest risks to global energy supply?"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle"
          />
          <Button type="submit" variant="accent"><Send size={12} /></Button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-subtle hover:text-gray-200 hover:border-borderStrong"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {exchanges.map((ex) => (
            <div key={ex.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
              <div className="mb-2 font-mono text-[12px] text-gray-400">
                <span className="text-accent">{">"}</span> {ex.question}
              </div>
              {ex.loading ? (
                <div className="flex items-center gap-2 text-[12px] text-subtle">
                  <Sparkles size={13} className="animate-pulse" /> Analyzing available events, risk data, and stories…
                </div>
              ) : ex.error ? (
                <div className="text-[12px] text-red-400">{ex.error}</div>
              ) : ex.response ? (
                <AssessmentView response={ex.response} />
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentView({ response }: { response: IntelligenceResponse }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-panel px-3 py-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-subtle">Assessment</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase" style={{ color: SEVERITY_COLOR[response.current_risk_level] }}>
            {response.current_risk_level}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-gray-200">{response.assessment}</p>
      </div>

      {response.primary_drivers.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-subtle">Primary Drivers</div>
          <ol className="mt-1 list-decimal pl-4 text-[13px] text-gray-300">
            {response.primary_drivers.map((d, i) => <li key={i}>{d}</li>)}
          </ol>
        </div>
      )}

      {response.potential_impact.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-subtle">Potential Impact</div>
          <div className="mt-1 flex flex-col gap-1">
            {response.potential_impact.map((row, i) => (
              <div key={i} className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-gray-300">{row.domain}</span>
                <span className={
                  row.level === "HIGH" ? "text-red-400" : row.level === "MEDIUM" ? "text-yellow-400" : "text-green-400"
                }>{row.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {response.key_evidence.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-subtle">Key Evidence</div>
          <ul className="mt-1 flex flex-col gap-0.5 text-[12px]">
            {response.key_evidence.map((e, i) => (
              <li key={i}>
                {e.ref_type === "event" ? (
                  <Link href={`/events/${e.ref_id}`} className="text-accent hover:underline">{e.label}</Link>
                ) : (
                  <span className="text-gray-300">{e.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2 font-mono text-[11px] text-subtle">
        <span>Confidence: {Math.round(response.confidence)}%</span>
        {response.tool_calls_made.length > 0 && <span>{response.tool_calls_made.length} tool call(s)</span>}
      </div>
      <p className="text-[10px] text-subtle">{response.note}</p>
    </div>
  );
}
