"""
Database models using SQLAlchemy ORM
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import enum


class Base(DeclarativeBase):
    """Base class for all database models"""

    pass


class PlanLineageType(str, enum.Enum):
    """Plan element lineage tracking"""

    AI_GENERATED = "ai_generated"
    HUMAN_CREATED = "human_created"
    HYBRID = "hybrid"


class PlanStatus(str, enum.Enum):
    """Plan processing status"""

    UPLOADED = "uploaded"
    PARSING = "parsing"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Plan(Base):
    """Plan entity - represents a complete planning solution"""

    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(SQLEnum(PlanStatus), default=PlanStatus.UPLOADED)
    lineage: Mapped[str] = mapped_column(
        SQLEnum(PlanLineageType), default=PlanLineageType.HUMAN_CREATED
    )

    # Metadata
    total_duration_days: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    capacity_utilization: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_cost: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Storage references
    source_file_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    plan_data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Task(Base):
    """Task entity - represents a planning unit"""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    task_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Schedule
    duration_days: Mapped[float] = mapped_column(Float, nullable=False)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Resources and constraints
    resource_requirements: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    dependencies: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    constraints: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Priority and cost
    priority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cost: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Explainability fields
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assumptions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    trade_offs: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Lineage tracking
    lineage: Mapped[str] = mapped_column(
        SQLEnum(PlanLineageType), default=PlanLineageType.HUMAN_CREATED
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Resource(Base):
    """Resource entity - represents an asset (equipment, personnel, facility)"""

    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    resource_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)

    # Capacity and availability
    capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    availability_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    availability_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Cost and skills
    hourly_cost: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    skills: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Allocation status
    allocation_status: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Assumption(Base):
    """Assumption entity - explicit assumptions made during plan generation"""

    __tablename__ = "assumptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    assumption_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Recommendation(Base):
    """Recommendation entity - AI suggestions for plan improvement"""

    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    recommendation_type: Mapped[str] = mapped_column(String(100), nullable=False)
    affected_entities: Mapped[dict] = mapped_column(JSON, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    impact_metrics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # User decision tracking
    status: Mapped[str] = mapped_column(
        String(50), default="pending"
    )  # pending, accepted, rejected

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
