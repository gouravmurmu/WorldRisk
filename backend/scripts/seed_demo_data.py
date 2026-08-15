"""Seed the database with deterministic demo data.

Usage:
    cd backend
    python scripts/seed_demo_data.py

Populates crisis_events, event_sources, event_relationships and a set of
risk_snapshots (global + per-region + per-country) using the same
deterministic DemoProvider the app falls back to at runtime — running this
script twice is idempotent (events are upserted by source_event_id).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import init_db  # noqa: E402
from app.ingestion.pipeline import run_ingestion_cycle_sync  # noqa: E402


def main() -> None:
    print("Initializing database (creating tables / PostGIS extension if needed)...")
    init_db()

    print("Running ingestion cycle (demo dataset)...")
    result = run_ingestion_cycle_sync()

    print(f"Seeded {result['event_count']} events, {result['relationship_count']} relationships.")
    print(f"Mode: {result['mode']}, source breakdown: {result['source_breakdown']}")


if __name__ == "__main__":
    main()
