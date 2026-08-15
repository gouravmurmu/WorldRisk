# Deploying Global Crisis Intelligence for free

Three free services, wired together:

```text
Vercel (frontend, Next.js)  →  Render (backend, FastAPI)  →  Supabase (Postgres + PostGIS)
```

All three have generous free tiers with no credit card required for the tiers used
here. Two honest caveats before you start:

- **Render's free web service sleeps after 15 minutes of no traffic.** The first
  request after a sleep takes ~30-50s to wake up, and the background ingestion
  scheduler pauses while asleep (it re-runs immediately on wake, so data is never
  more than "one visit" stale). Fine for a demo/portfolio deployment; not fine for
  genuine 24/7 monitoring — for that, upgrade the Render plan or move the backend
  to Fly.io (always-on free allowance).
- **Supabase free projects pause after 7 days with zero API requests.** If nobody
  visits for a week, the next visit will fail until you un-pause it from the
  Supabase dashboard (one click). Visiting the site periodically avoids this.

Keep `DEMO_MODE=true` throughout — you get a fully working, realistic dashboard
with zero API keys, zero cost, and no rate-limit risk.

## 0. Push the code to GitHub

Render and Vercel both deploy by connecting to a GitHub repo.

1. Go to https://github.com/new, create an **empty** repository (don't
   initialize with a README/.gitignore — this project already has them),
   e.g. named `global-crisis-intelligence`.
2. Copy the repo URL it gives you (`https://github.com/<you>/global-crisis-intelligence.git`).
3. Tell me that URL and I'll wire the local repo to it and push — I'll ask
   you to confirm before actually pushing.

## 1. Database — Supabase (free Postgres + PostGIS)

1. Sign up at https://supabase.com and create a new project (pick any
   region close to where you'll deploy the backend, e.g. US West if using
   Render's Oregon region). Note the database password you set — you'll need
   it in the connection string.
2. Wait for provisioning (~2 minutes).
3. Enable PostGIS: **Database → Extensions** → search `postgis` → enable it.
   (The app also tries `CREATE EXTENSION IF NOT EXISTS postgis` itself on
   startup, so this step is a safety net if that fails due to permissions.)
4. Get the connection string: **Settings → Database → Connection string**.
   Use the **Session pooler** string (not "Direct connection" — Supabase's
   direct connection is IPv6-only and Render's free tier can't reach it; the
   session pooler is IPv4-compatible and behaves like a normal Postgres
   connection for our SQLAlchemy setup).
5. It looks like:
   `postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres`
   Change the scheme prefix from `postgresql://` to `postgresql+psycopg://`
   (SQLAlchemy needs the driver name) — that full string is your
   `DATABASE_URL`.

## 2. Backend — Render

1. Sign up at https://render.com and connect your GitHub account.
2. **New → Blueprint**, select the repo you pushed. Render will detect
   `render.yaml` at the repo root automatically.
3. It'll ask you to fill in the values marked `sync: false`:
   - `DATABASE_URL` → the Supabase connection string from step 1 (with the
     `+psycopg` prefix)
   - `GDELT_CLOUD_API_KEY` → leave blank (stays in demo mode)
   - `LLM_API_KEY` → leave blank (analyst uses the rule-based fallback), or
     paste an Anthropic API key for real AI-generated assessments
   - `FRONTEND_ORIGIN` → leave blank for now, you'll set it after step 3
4. Deploy. First build takes a few minutes. Once live, note the URL Render
   gives you, e.g. `https://gci-backend.onrender.com`.
5. Sanity check: open `https://gci-backend.onrender.com/api/health` — should
   return `{"status":"ok","demo_mode":true}`. Also check
   `https://gci-backend.onrender.com/docs` for the interactive API docs.

## 3. Frontend — Vercel

1. Sign up at https://vercel.com and connect your GitHub account.
2. **Add New → Project**, import the same repo.
3. Set **Root Directory** to `frontend` (Vercel's project settings, under
   "Root Directory" — click "Edit" next to it during import).
4. Add environment variables (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL` = `https://gci-backend.onrender.com` (your Render URL)
   - `NEXT_PUBLIC_WS_URL` = `wss://gci-backend.onrender.com/ws` (same host,
     `wss://` scheme, `/ws` path — Render terminates TLS so it must be `wss`,
     not `ws`)
5. Deploy. Vercel gives you a URL like `https://global-crisis-intelligence.vercel.app`.

## 4. Close the loop: tell the backend about the frontend's origin

Go back to Render → your service → **Environment**, set `FRONTEND_ORIGIN` to
your Vercel URL from step 3 (e.g. `https://global-crisis-intelligence.vercel.app`,
no trailing slash), save. Render redeploys automatically. This is what makes
CORS allow the browser to call the API from that origin.

## 5. Verify

Open your Vercel URL. You should see:
- Header shows **DEMO MODE** and the LIVE indicator turns green within a few
  seconds (WebSocket connected)
- Map populates with ~140 events
- `/countries` shows populated countries including India, US, China, etc.
- `/settings` shows GDACS/GDELT as configured, database HEALTHY

If the LIVE indicator stays gray: open browser dev tools → Network → check
the `wss://.../ws` request status, and confirm `NEXT_PUBLIC_WS_URL` was set
*before* the Vercel build ran (Next.js bakes `NEXT_PUBLIC_*` vars in at build
time — changing them requires a redeploy, not just a restart).

## Costs & limits at a glance

| Service | Free tier limit | What happens if exceeded |
|---|---|---|
| Vercel | 100 GB bandwidth/mo (hobby) | Site throttled until next month |
| Render | 750 instance-hours/mo, sleeps after 15 min idle | Extra hours cost money; sleep is automatic, not a hard limit |
| Supabase | 500 MB database, pauses after 7 days idle | Un-pause manually in dashboard; upgrade for more storage |

None of these will bill you automatically — they require you to add a
payment method and explicitly upgrade before any charge occurs.
