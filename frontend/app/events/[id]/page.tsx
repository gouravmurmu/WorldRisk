"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalMap } from "@/components/map/GlobalMap";
import { RiskBreakdown } from "@/components/events/RiskBreakdown";
import { SourceList } from "@/components/events/SourceList";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { EventOut, EventRelationshipOut, EventSourceOut, IntelligenceResponse } from "@/lib/types";
import { CATEGORY_COLOR, CATEGORY_LABEL, SEVERITY_COLOR, formatUTCTime, trendArrow } from "@/lib/utils";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventOut | null>(null);
  const [sources, setSources] = useState<EventSourceOut[]>([]);
  const [relationships, setRelationships] = useState<EventRelationshipOut[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [assessment, setAssessment] = useState<IntelligenceResponse | null>(null);
  const [assessing, setAssessing] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    setNotFound(false);
    Promise.all([
      api.event(params.id).catch(() => null),
      api.eventSources(params.id).catch(() => []),
      api.eventRelationships(params.id).catch(() => []),
    ]).then(([ev, src, rel]) => {
      if (!ev) {
        setNotFound(true);
        return;
      }
      setEvent(ev);
      setSources(src);
      setRelationships(rel);
    });
  }, [params.id]);

  async function runAssessment() {
    if (!event) return;
    setAssessing(true);
    try {
      const result = await api.askIntelligence(
        `Provide an intelligence assessment of the event "${event.title}" (id ${event.id}) in ${event.country}. Use get_event_details and find_related_events first.`
      );
      setAssessment(result);
    } catch {
      setAssessment(null);
    } finally {
      setAssessing(false);
    }
  }

  if (notFound) {
    return (
      <AppShell>
        <div className="flex h-full flex-col items-center justify-center gap-3 text-subtle">
          <p>Event not found.</p>
          <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-[12px] text-subtle hover:text-gray-200">
          <ArrowLeft size={13} /> Back to dashboard
        </Link>

        {!event ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <Card className="p-5">
              <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: CATEGORY_COLOR[event.event_category] }}>
                {CATEGORY_LABEL[event.event_category]} · {event.event_type}
              </span>
              <h1 className="mt-1 text-2xl font-semibold text-gray-50">{event.title}</h1>
              <div className="mt-1 text-[13px] text-muted">
                {event.country} · {event.region}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-3xl font-bold" style={{ color: SEVERITY_COLOR[event.severity_level] }}>
                    {event.risk_score}
                  </span>
                  <SeverityBadge level={event.severity_level} />
                </div>
                <Divider />
                <Stat label="Confidence" value={`${Math.round(event.confidence_score)}%`} />
                <Divider />
                <Stat label="Status" value={event.status} />
                <Divider />
                <Stat label="Trend" value={`${trendArrow(event.trend)} ${event.trend}`} />
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Event Summary</CardTitle></CardHeader>
              <CardContent className="text-[13px] leading-relaxed text-gray-300">{event.summary}</CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricTile label="Population Exposure" value={event.population_exposure} />
              <MetricTile label="Economic Exposure" value={event.economic_exposure} />
              <MetricTile label="Escalation" value={event.escalation_score} />
              <MetricTile label="Geographic Spread" value={event.geographic_spread} />
            </div>

            <Card>
              <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <TimelineRow time={formatUTCTime(event.event_date)} label="Event occurred" />
                <TimelineRow time={formatUTCTime(event.detected_at)} label="Detected by ingestion pipeline" />
                <TimelineRow time={formatUTCTime(event.updated_at)} label="Last updated (severity / sources / impact)" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Impact</CardTitle>
                <span className="font-mono text-[11px] text-subtle">radius ~{Math.round(event.radius_km)} km</span>
              </CardHeader>
              <CardContent className="h-64 overflow-hidden rounded-md p-0">
                <GlobalMap
                  events={[event]}
                  toggles={{ heatmap: false, populationExposure: false, riskZones: true, connections: false }}
                  onSelectEvent={() => {}}
                  center={[event.longitude, event.latitude]}
                  zoom={4}
                  interactiveControls={false}
                />
              </CardContent>
            </Card>

            <SourceList sources={sources} />

            <Card>
              <CardHeader>
                <CardTitle>Related Events</CardTitle>
                <span className="font-mono text-[11px] text-subtle">{relationships.length}</span>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {relationships.length === 0 ? (
                  <div className="py-2 text-[12px] text-subtle">No related events identified.</div>
                ) : (
                  relationships.map((r) => {
                    const otherId = r.source_event_id === event.id ? r.target_event_id : r.source_event_id;
                    return (
                      <Link
                        key={r.id}
                        href={`/events/${otherId}`}
                        className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0 hover:opacity-80"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] uppercase text-accent">{r.relationship_type.replace(/_/g, " ")}</span>
                            <span className="rounded border border-border px-1 font-mono text-[9px] uppercase text-subtle">{r.evidence}</span>
                          </div>
                          <div className="truncate text-[13px] text-gray-200">{r.other_event_title}</div>
                          <div className="text-[11px] text-subtle">{r.reason}</div>
                        </div>
                        <div className="shrink-0 font-mono text-[11px] text-subtle">strength {Math.round(r.strength)}</div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <RiskBreakdown riskScore={event.risk_score} components={event.risk_components} />

            <Card>
              <CardHeader>
                <CardTitle>AI Assessment</CardTitle>
                <Button variant="accent" onClick={runAssessment} disabled={assessing}>
                  <Sparkles size={12} /> {assessing ? "Analyzing…" : assessment ? "Re-run" : "Run Assessment"}
                </Button>
              </CardHeader>
              <CardContent>
                {!assessment ? (
                  <p className="text-[12px] text-subtle">
                    Generate an AI-grounded assessment of this event using live dashboard data. Not a verified forecast.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 text-[13px]">
                    <p className="text-gray-200">{assessment.assessment}</p>
                    <div>
                      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-subtle">Key Drivers</div>
                      <ul className="list-disc pl-4 text-gray-300">
                        {assessment.primary_drivers.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-subtle">
                      <span>Confidence: {Math.round(assessment.confidence)}%</span>
                    </div>
                    <p className="rounded border border-border bg-panel px-2 py-1.5 text-[11px] text-subtle">{assessment.note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Divider() {
  return <div className="h-8 w-px bg-border" />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-subtle">{label}</div>
      <div className="text-[13px] text-gray-200">{value}</div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-3 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-subtle">{label}</div>
      <div className="mt-1 font-mono text-lg text-gray-100">{Math.round(value)}</div>
    </Card>
  );
}

function TimelineRow({ time, label }: { time: string; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 font-mono text-[11px] text-accent">{time}</span>
      <span className="text-[13px] text-gray-300">{label}</span>
    </div>
  );
}
