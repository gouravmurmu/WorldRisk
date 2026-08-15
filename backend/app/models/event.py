import uuid
from datetime import datetime, timezone

from geoalchemy2 import Geometry
from sqlalchemy import (
    JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class CrisisEvent(Base):
    __tablename__ = "crisis_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    source: Mapped[str] = mapped_column(String, index=True)
    source_event_id: Mapped[str] = mapped_column(String, index=True)

    event_type: Mapped[str] = mapped_column(String)
    event_category: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text, default="")

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    geom = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    affected_geom = mapped_column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True)
    radius_km: Mapped[float] = mapped_column(Float, default=0.0)

    country: Mapped[str] = mapped_column(String, default="")
    country_code: Mapped[str] = mapped_column(String, index=True, default="")
    region: Mapped[str] = mapped_column(String, index=True, default="")
    continent: Mapped[str] = mapped_column(String, default="")
    admin1: Mapped[str] = mapped_column(String, default="")

    severity: Mapped[float] = mapped_column(Float, default=0.0)
    risk_score: Mapped[float] = mapped_column(Float, index=True, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=70.0)

    # transparent risk component breakdown, stored so /events/{id} can show
    # the exact inputs that produced risk_score without recomputing
    risk_components: Mapped[dict] = mapped_column(JSON, default=dict)

    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    population_exposure: Mapped[float] = mapped_column(Float, default=0.0)
    economic_exposure: Mapped[float] = mapped_column(Float, default=0.0)
    geographic_spread: Mapped[float] = mapped_column(Float, default=0.0)
    escalation_score: Mapped[float] = mapped_column(Float, default=0.0)

    has_fatalities: Mapped[bool] = mapped_column(Boolean, default=False)
    fatalities: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(String, default="ACTIVE")  # ACTIVE | MONITORING | RESOLVED
    trend: Mapped[str] = mapped_column(String, default="STABLE")  # ESCALATING | STABLE | DE_ESCALATING

    source_url: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    sources: Mapped[list["EventSource"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )


class EventSource(Base):
    __tablename__ = "event_sources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    event_id: Mapped[str] = mapped_column(ForeignKey("crisis_events.id"), index=True)
    provider: Mapped[str] = mapped_column(String)
    source_url: Mapped[str] = mapped_column(String, default="")
    title: Mapped[str] = mapped_column(String, default="")
    publisher: Mapped[str] = mapped_column(String, default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_type: Mapped[str] = mapped_column(String, default="ARTICLE")  # EVENT | STORY | SOURCE_ARTICLE
    credibility_score: Mapped[float] = mapped_column(Float, default=70.0)

    event: Mapped["CrisisEvent"] = relationship(back_populates="sources")


class EventRelationship(Base):
    __tablename__ = "event_relationships"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    source_event_id: Mapped[str] = mapped_column(ForeignKey("crisis_events.id"), index=True)
    target_event_id: Mapped[str] = mapped_column(ForeignKey("crisis_events.id"), index=True)

    relationship_type: Mapped[str] = mapped_column(String)
    evidence: Mapped[str] = mapped_column(String, default="INFERRED")  # OBSERVED | INFERRED | SCENARIO
    reason: Mapped[str] = mapped_column(Text, default="")

    strength: Mapped[float] = mapped_column(Float, default=50.0)
    confidence: Mapped[float] = mapped_column(Float, default=50.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
