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


def init_db() -> None:
    """Create the PostGIS extension (if missing) and all tables.

    v1 uses create_all instead of Alembic migrations, mirroring a
    single-instance app with a stable, evolving schema. Add Alembic before
    this ever needs a real production migration path.
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
