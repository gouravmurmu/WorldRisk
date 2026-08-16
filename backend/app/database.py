from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()

# echo GeoAlchemy2 PostGIS functions on table create; falls back gracefully if
# the driver can't reach a live PostGIS extension (e.g. local dev without docker).
engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columns added to a model after it was already deployed somewhere.
# create_all() only creates missing *tables*, never adds columns to a table
# that already exists — so a deployed database needs each of these patched
# in by hand. Kept as a flat, append-only list instead of pulling in Alembic
# (see README "Architecture Decisions"): every entry is an idempotent
# `ADD COLUMN IF NOT EXISTS`, safe to re-run on every boot.
_COLUMN_MIGRATIONS: list[tuple[str, str, str]] = [
    ("crisis_events", "metrics", "JSON DEFAULT '{}'::json"),
    ("crisis_events", "timeline", "JSON DEFAULT '[]'::json"),
    ("crisis_events", "article", "TEXT DEFAULT ''"),
]


def init_db() -> None:
    """Create the PostGIS extension (if missing), all tables, and patch in
    any columns added after this database was first created.
    """
    from sqlalchemy import text

    import app.models  # noqa: F401 ensure models are registered on Base

    with engine.begin() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        except Exception:
            # Non-Postgres or restricted DB (e.g. SQLite in tests) — skip PostGIS.
            pass
    Base.metadata.create_all(bind=engine)

    for table, column, ddl in _COLUMN_MIGRATIONS:
        # Each statement gets its own transaction: a failure on one (e.g.
        # unsupported syntax on a non-Postgres backend) must not abort the
        # whole batch and skip patching the rest.
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {ddl}"))
        except Exception:
            pass
