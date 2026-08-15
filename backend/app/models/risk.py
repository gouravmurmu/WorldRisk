import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class RiskSnapshot(Base):
    """A point-in-time global/regional/country risk reading.

    Snapshots accumulate over time (written by the ingestion scheduler after
    every risk recompute) and back the /history endpoints and trend charts.
    """

    __tablename__ = "risk_snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)

    global_risk: Mapped[float] = mapped_column(Float, default=0.0)
    geopolitical_risk: Mapped[float] = mapped_column(Float, default=0.0)
    natural_disaster_risk: Mapped[float] = mapped_column(Float, default=0.0)
    economic_risk: Mapped[float] = mapped_column(Float, default=0.0)
    infrastructure_risk: Mapped[float] = mapped_column(Float, default=0.0)
    cyber_risk: Mapped[float] = mapped_column(Float, default=0.0)
    humanitarian_risk: Mapped[float] = mapped_column(Float, default=0.0)
    weather_risk: Mapped[float] = mapped_column(Float, default=0.0)
    health_risk: Mapped[float] = mapped_column(Float, default=0.0)

    # Scope: global snapshots leave both blank; regional sets region only;
    # country sets country only.
    region: Mapped[str] = mapped_column(String, default="", index=True)
    country: Mapped[str] = mapped_column(String, default="", index=True)
