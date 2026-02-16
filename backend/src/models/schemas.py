"""
Pydantic schemas for data validation and serialization
Separate from database models to allow flexibility in API contracts
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TaskSchema(BaseModel):
    """Task data schema"""

    task_id: str
    name: str
    duration_days: float
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    resource_requirements: Optional[Dict[str, Any]] = None
    dependencies: Optional[List[str]] = None
    constraints: Optional[Dict[str, Any]] = None
    priority: Optional[str] = None
    cost: Optional[float] = None
    lineage: str = "human_created"  # ai_generated, human_created, hybrid

    class Config:
        from_attributes = True


class ResourceSchema(BaseModel):
    """Resource data schema"""

    resource_id: str
    name: str
    type: str  # Equipment, Personnel, Facility
    capacity: Optional[int] = None
    availability_start: Optional[datetime] = None
    availability_end: Optional[datetime] = None
    hourly_cost: Optional[float] = None
    skills: Optional[List[str]] = None

    class Config:
        from_attributes = True


class AssumptionSchema(BaseModel):
    """Assumption data schema"""

    assumption_type: str
    description: str
    value: Optional[str] = None

    class Config:
        from_attributes = True


class RecommendationSchema(BaseModel):
    """Recommendation data schema"""

    recommendation_type: str
    affected_entities: Dict[str, Any]
    rationale: str
    impact_metrics: Optional[Dict[str, Any]] = None
    status: str = "pending"  # pending, accepted, rejected

    class Config:
        from_attributes = True


class PlanSchema(BaseModel):
    """Complete plan data schema"""

    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: str = "uploaded"  # uploaded, parsing, generating, completed, failed
    lineage: str = "human_created"  # ai_generated, human_created, hybrid
    total_duration_days: Optional[float] = None
    capacity_utilization: Optional[float] = None
    total_cost: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Related entities
    tasks: List[TaskSchema] = []
    resources: List[ResourceSchema] = []
    assumptions: List[AssumptionSchema] = []
    recommendations: List[RecommendationSchema] = []

    class Config:
        from_attributes = True


class PlanCreateRequest(BaseModel):
    """Request schema for creating a new plan"""

    name: str = Field(..., description="Plan name")
    description: Optional[str] = Field(None, description="Plan description")


class PlanUploadResponse(BaseModel):
    """Response schema after plan upload"""

    plan_id: int
    name: str
    status: str
    tasks_count: int
    resources_count: int
    message: str
