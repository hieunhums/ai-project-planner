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
    explanation: Optional[str] = None
    assumptions: Optional[List[str]] = None
    trade_offs: Optional[List[str]] = None

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

    id: Optional[int] = None
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
    project_id: Optional[int] = None
    base_plan_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: str = "uploaded"  # uploaded, parsing, generating, completed, failed
    lineage: str = "human_created"  # ai_generated, human_created, hybrid
    total_duration_days: Optional[float] = None
    capacity_utilization: Optional[float] = None
    total_cost: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    source_file_path: Optional[str] = None
    source_file_name: Optional[str] = None
    plan_data_json: Optional[Dict[str, Any]] = None

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


class ProjectCreateRequest(BaseModel):
    """Request schema for creating a project"""

    name: str = Field(..., description="Project name")


class ProjectSummary(BaseModel):
    """Summary schema for project list"""

    id: int
    name: str
    created_at: Optional[datetime] = None
    project_type: str = "confirmed"  # "confirmed" | "enquiry"


class UploadSummary(BaseModel):
    """Summary schema for uploaded file entries"""

    plan_id: int
    file_name: str
    uploaded_at: Optional[datetime] = None
    status_label: str


class GeneratedPlanSummary(BaseModel):
    """Summary schema for generated plans"""

    plan_id: int
    name: str
    generated_at: Optional[datetime] = None
    status_label: str


class ProjectDetail(BaseModel):
    """Project details with uploads and generated plans"""

    id: int
    name: str
    uploads: List[UploadSummary]
    generated_plans: List[GeneratedPlanSummary]


class ConstraintUpdateRequest(BaseModel):
    """Request schema for updating constraints"""

    constraints: Dict[str, Any] = Field(default_factory=dict)
    regenerate: bool = True


class PlanComparisonRequest(BaseModel):
    """Request schema for plan comparison"""

    plan_id_1: int
    plan_id_2: int


class PlanComparisonChange(BaseModel):
    """Single field difference between two tasks"""

    field: str
    plan_1: Optional[Any] = None
    plan_2: Optional[Any] = None


class TaskDifference(BaseModel):
    """Task-level comparison result"""

    task_id: str
    name: str
    status: str
    changes: List[PlanComparisonChange] = []


class PlanComparisonSummary(BaseModel):
    """Summary metrics for plan comparison"""

    duration_delta_days: float
    cost_delta: float
    capacity_delta: float
    task_count_delta: int
    resource_count_delta: int
    plan_a_metrics: Dict[str, Any]
    plan_b_metrics: Dict[str, Any]


class PlanComparisonSchema(BaseModel):
    """Plan comparison response schema"""

    plan_id_1: Optional[int] = None
    plan_id_2: Optional[int] = None
    summary: PlanComparisonSummary
    task_differences: List[TaskDifference]
    tradeoffs: List[str]
    generated_at: Optional[str] = None


class RecommendationDecisionRequest(BaseModel):
    """Request schema for accepting or rejecting a recommendation"""

    accept: bool = Field(..., description="Whether the recommendation is accepted")


class RecommendationDecisionResponse(BaseModel):
    """Response schema after recommendation decision"""

    plan_id: int
    recommendation_id: int
    status: str
    updated_task_ids: List[str] = []


# ---------------------------------------------------------------------------
# Sprint 002: Enquiry-to-Proposal schemas
# Date strings throughout all schemas use DD-MM-YYYY format to match
# the existing CSV fixture convention (e.g. "01-02-2026").
# ---------------------------------------------------------------------------


class ProjectDetailsRequest(BaseModel):
    """Request schema for saving project details form data"""

    project_type: str  # "confirmed" | "enquiry"
    project_name: str
    start_date: str  # DD-MM-YYYY
    end_date: str  # DD-MM-YYYY
    hull_length: float
    hull_width: float
    hull_height: float
    topside_weight: float
    preferred_location: str
    preferred_yard: str
    processes: List[str]
    block_breakdown: str


class YardAvailabilityRow(BaseModel):
    """Single row in the yard availability table"""

    yard_name: str
    location: str
    availability: str  # "Available" | "Occupied"


class YardAvailabilityResponse(BaseModel):
    """Response from the yard availability stub endpoint"""

    yards: List[YardAvailabilityRow]


class CapacityPlanRow(BaseModel):
    """Single row in the AI-augmented capacity plan"""

    project_id: str
    project_name: str
    duration_days: int
    start_date: str  # DD-MM-YYYY
    end_date: str  # DD-MM-YYYY
    resource: str
    dependencies: str
    cost: str
    priority: str


class CapacityPlanResponse(BaseModel):
    """Response from the capacity plan stub endpoint"""

    plan: List[CapacityPlanRow]
    rationale: str


class CapacityPlanRequest(BaseModel):
    """Request body for POST /capacity-plan"""

    selected_yards: List[str]
    prompt: str


class NLEditRequest(BaseModel):
    """Request body for POST /plan-edit/parse"""

    command: str


class NLEditAction(BaseModel):
    """Structured edit action returned by the NL parse endpoint"""

    project_id: str
    field: str  # "resource" (MVP scope)
    from_value: str
    to_value: str


class PlanUpdateRequest(BaseModel):
    """Request body for PUT /plan — full plan row replacement"""

    rows: List[CapacityPlanRow]
