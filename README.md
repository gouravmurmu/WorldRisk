# Global Crisis Intelligence

A real-time global crisis monitoring and intelligence dashboard — disaster data,
geopolitical events, geospatial visualization, an explainable risk engine, event
relationships, historical analysis, and an AI intelligence analyst, in one
Palantir/Bloomberg-style command-center UI.

> **This is a demo-capable reference build.** With no API keys configured it runs
> entirely on a deterministic demo dataset (clearly labeled **DEMO MODE** in the
> header). Add real credentials and it ingests live GDACS + GDELT Cloud data.

## Architecture

```text
GDACS ──────┐
            │
GDELT ──────┼──→ Ingestion ─→ Normalization ─→ PostgreSQL / PostGIS
            │                                          │
Demo ───────┘                                          ↓
                                                   Risk Engine
                                                        │
                                                        ↓
                                              FastAPI (REST + WebSocket)
                                                        │
                                                        ↓
                                                    Next.js UI
```

- **Ingestion** (`backend/app/ingestion`) runs on a background scheduler
  (APScheduler), fetching from provider adapters and never letting the browser
  talk to GDACS/GDELT directly.
- **Normalization** (`app/services/normalization_service.py`) maps every
  provider's schema into one internal `NormalizedEvent`, so the rest of the app
  never branches on data source.
- **Risk Engine** (`app/services/risk_service.py`) is a deterministic, fully
  explainable weighted formula (see below) — every score can be decomposed into
  its named components in the UI.
- **Relationship Engine** (`app/services/relationship_service.py`) infers
  plausible crisis propagation (conflict → supply chain → economic, disaster →
  infrastructure, etc.) and labels every edge OBSERVED / INFERRED / SCENARIO.
- **AI Intelligence Analyst** (`app/services/intelligence_service.py`) calls
  backend tools (the same query layer the REST API uses) before answering —
  it cannot invent statistics — and submits its final answer through a
  structured `submit_assessment` tool call rather than free text.
- **Real-time**: a WebSocket (`/ws`) broadcasts a lightweight "data refreshed"
  event after each ingestion cycle; the frontend re-fetches instead of taking a
  push feed of full event payloads (keeps the wire format trivial and avoids
  clock-skew merge issues client-side).

## Features

- Cinematic dark world map (MapLibre GL, clustering, heatmap, risk zones,
  event-connection overlay) as the dashboard's centerpiece
- KPI row, top developments, regional risk, 90-day trend chart, shareable
  timeline presets
- Event intelligence drawer + full event detail pages (risk breakdown,
  evidence, related events, AI assessment)
- Country and region intelligence pages
- Historical analysis (daily counts, top events, country activity)
- Intelligence Graph (event relationship visualization)
- AI Intelligence Analyst with tool-calling and evidence-linked answers
- Scenario Simulator (deterministic "what-if" propagation, clearly labeled as
  a simulation, not a forecast)
- Full demo mode with 140+ deterministic events across 60+ countries and all
  ten taxonomy categories

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + MapLibre GL + Recharts + Framer Motion |
| Backend | FastAPI + SQLAlchemy + GeoAlchemy2 + httpx + APScheduler |
| Database | PostgreSQL + PostGIS |
| AI | Anthropic Messages API (tool calling), with a rule-based fallback when no key is set |
| Local dev | Docker Compose (postgres + backend + frontend) |

## Setup

```bash
git clone <repo-url>
cd global-crisis-intelligence
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend docs (OpenAPI): http://localhost:8000/docs

**Want a live public URL instead?** See [DEPLOYMENT.md](DEPLOYMENT.md) for a
free Vercel + Render + Supabase deployment walkthrough.

### Running without Docker

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python scripts/seed_demo_data.py   # optional — the app also seeds itself on first boot
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Backend tests: `cd backend && python -m pytest`

## API Keys

| Variable | Required? | Where to get it |
|---|---|---|
| `GDACS_BASE_URL` | No — public API, no key needed | Default value already points at the public GDACS API |
| `GDELT_CLOUD_API_KEY` | No — falls back to demo/GDACS-only data | https://docs.gdeltcloud.com |
| `LLM_API_KEY` | No — falls back to a rule-based (non-LLM) analyst | Anthropic API key |

Leave `DEMO_MODE=true` (the default) to run entirely on deterministic demo data
regardless of which keys are set.

## Demo Mode

`DEMO_MODE=true` (default) makes the ingestion pipeline use
`app/services/demo_provider.py` — a deterministic generator (fixed random seed)
that produces ~140 events across all ten taxonomy categories, 60+ countries,
and the last 90 days, plus derived relationships and risk snapshots. The
header and Settings page always show **DEMO MODE** explicitly; demo data is
never presented as live.

Set `DEMO_MODE=false` with a `GDELT_CLOUD_API_KEY` configured to ingest live
data. If both live providers return nothing (missing key, network failure),
the pipeline automatically falls back to the demo dataset so the dashboard is
never empty — this is reported as `DEMO_FALLBACK` in `/api/system/status`.

## The Risk Engine

Every event gets a 0-100 score from named, normalized components:

```text
risk_score =
    0.25 * severity
  + 0.20 * population_exposure
  + 0.15 * economic_exposure
  + 0.15 * escalation
  + 0.10 * geographic_spread
  + 0.10 * confidence
  + 0.05 * recency
```

`recency` decays smoothly from the event timestamp (see
`risk_service.recency_score`). Aggregate scores (global / regional /
country / category) are **not** simple averages — each event is weighted by
its own severity, confidence, population exposure, and recency
(`risk_service.weighted_aggregate`) so a handful of critical events isn't
diluted by a long tail of minor ones, and resolved events fade out instead of
permanently inflating the aggregate.

## Architecture Decisions

- **PostGIS** — the app is fundamentally geospatial (event points, affected
  areas, spatial queries for relationships); PostGIS gives real geometry types
  and indexing instead of ad-hoc lat/lon filtering.
- **MapLibre GL** (not Mapbox GL) — open-source, no API key required, and the
  raster/vector styling model is what makes the clustering + heatmap + risk
  zone layers possible without rendering thousands of DOM markers.
- **FastAPI** — async-first, typed with Pydantic end-to-end, and its
  auto-generated OpenAPI docs matter for a data-heavy API surface like this.
- **Next.js App Router** — colocated layouts/routes for a dozen+ intelligence
  views, React Server/Client Component split where it matters (most of this
  UI is inherently interactive, so most components are client components).
- **WebSockets over SSE** — bidirectional headroom if the frontend ever needs
  to push filter/subscription state to the server; for v1 it's a one-way
  "data refreshed" signal.
- **Provider abstraction** (`DataProvider`-shaped adapters: GDACS, GDELT,
  Demo) — the frontend and risk/relationship engines only ever see
  `NormalizedEvent`, so a new data source is one adapter, not a UI rewrite.
- **Deterministic risk engine first** — a fixed, named, linear weighting is
  fully explainable in the UI (every score decomposes into its inputs). A
  trained model could later replace `risk_service.compute_score` without
  touching any call site.

## Limitations

- Risk scores are analytical heuristics, not measured ground truth.
- AI assessments (`/api/intelligence/query`) are analytical summaries
  generated from live dashboard data — not verified forecasts. Without
  `LLM_API_KEY` configured, the analyst falls back to a rule-based summary
  built from the same query layer, not natural-language synthesis.
- External source data (GDACS/GDELT) can be delayed, incomplete, or
  temporarily unavailable; the dashboard reports `DEGRADED` and keeps serving
  the last-known state rather than failing.
- Inferred event relationships (`EventRelationship.evidence = INFERRED`)
  describe plausible propagation based on category/time/geography adjacency —
  they are not verified causal claims. Only a future upstream source that
  explicitly states a relationship would be labeled `OBSERVED`.
- Scenario simulations use fixed, hand-authored propagation coefficients
  (`scenario_service.IMPACT_COEFFICIENTS`) — explicitly a simulation, not a
  forecast.
- Country/region boundaries used for aggregation are a coarse lookup table
  (`normalization_service.COUNTRY_REGION`), not a full geospatial reference
  dataset.

## Data Sources & Attribution

- **[GDACS](https://www.gdacs.org)** — Global Disaster Alert and Coordination
  System (earthquakes, cyclones, floods, volcanoes, wildfires, droughts).
- **[GDELT Cloud API v2](https://docs.gdeltcloud.com/api-reference/v2)** —
  geopolitical/news intelligence (conflict, protest, infrastructure, economic,
  health, tech events and story clustering).
- Basemap tiles: CARTO Dark Matter, © OpenStreetMap contributors.

## Project Structure

```text
backend/app/
├── models/        # SQLAlchemy models (CrisisEvent, EventSource, EventRelationship, RiskSnapshot)
├── schemas/       # Pydantic request/response models
├── services/       # gdacs, gdelt, demo, normalization, risk, relationship, intelligence, scenario, cache, websocket
├── routers/        # events, risk, stories, history, scenarios, intelligence, system, ws
├── ingestion/       # pipeline (fetch→normalize→score→persist) + APScheduler
└── main.py

frontend/
├── app/            # dashboard, events/[id], countries, countries/[country], regions, regions/[region], intelligence, scenarios, history, settings
├── components/      # layout, map, dashboard, events, charts, countries, intelligence, scenarios, ui
└── lib/             # api client, types, ws hook, formatting helpers
```
