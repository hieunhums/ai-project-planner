"""
API route definitions for AI Planning Assistant
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, Any
import datetime
import io
import csv
import json
from pathlib import Path

from .models import SuccessResponse, ErrorResponse
from ..db import get_db
from ..config import get_settings
from ..services.storage_service import StorageService
from ..services.project_service import (
    list_projects,
    create_project,
    get_project_detail,
    delete_project,
)
from ..services.planning_service import (
    SpreadsheetParser,
    PlanGenerator,
    add_explanations_to_plan,
    apply_constraints_to_plan_data,
    build_plan_version_metadata,
    apply_recommendation_decision,
)
from ..services.comparison_service import PlanComparisonService
from ..services.simulation_service import simulate_yard_availability, simulate_capacity_plan
from ..services.nl_parse_service import parse_nl_command
from ..services.ai_service import MockAIService, AzureOpenAIService
from ..agents.planning_agent import create_planning_agent
from ..models.database import Plan, PlanStatus, PlanLineageType, Project
from ..models.schemas import (
    PlanSchema,
    TaskSchema,
    ResourceSchema,
    AssumptionSchema,
    RecommendationSchema,
    ProjectCreateRequest,
    ProjectSummary,
    ProjectDetail,
    ConstraintUpdateRequest,
    PlanComparisonRequest,
    RecommendationDecisionRequest,
    RecommendationDecisionResponse,
    # Sprint 002
    ProjectDetailsRequest,
    YardAvailabilityRow,
    YardAvailabilityResponse,
    CapacityPlanRow,
    CapacityPlanResponse,
    CapacityPlanRequest,
    NLEditRequest,
    NLEditAction,
    PlanUpdateRequest,
)

settings = get_settings()

# Create main API router
api_router = APIRouter(prefix="/api")

# Health check endpoint
health_router = APIRouter(prefix="/health", tags=["health"])


@health_router.get("")
async def health_check(db: Session = Depends(get_db)):
    """Detailed health check"""
    # Check database connection
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    # Check AI service (if configured)
    ai_status = "not_configured"
    if settings.azure_openai_endpoint and settings.azure_openai_api_key:
        ai_status = "configured"

    return {
        "status": "healthy",
        "database": db_status,
        "ai_service": ai_status,
    }


# Planning endpoints
planning_router = APIRouter(prefix="/plans", tags=["planning"])

# Project endpoints
project_router = APIRouter(prefix="/projects", tags=["projects"])


@project_router.get("")
async def get_projects(db: Session = Depends(get_db)) -> list[ProjectSummary]:
    """List all projects"""
    return list_projects(db)


@project_router.post("", status_code=201)
async def create_new_project(
    request: ProjectCreateRequest, db: Session = Depends(get_db)
) -> ProjectSummary:
    """Create a new project"""
    try:
        return create_project(db, request.name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@project_router.get("/{project_id}")
async def get_project(project_id: int, db: Session = Depends(get_db)) -> ProjectDetail:
    """Get project details with uploads and generated plans"""
    try:
        return get_project_detail(db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@project_router.delete("/{project_id}", status_code=204)
async def delete_project_endpoint(project_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a project and all associated plans"""
    try:
        delete_project(db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ---------------------------------------------------------------------------
# Sprint 002: Enquiry-to-Proposal routes
# ---------------------------------------------------------------------------


@project_router.post("/{project_id}/details", status_code=200)
async def save_project_details(
    project_id: int,
    project_type: str = Form(...),
    project_name: str = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    hull_length: float = Form(...),
    hull_width: float = Form(...),
    hull_height: float = Form(...),
    topside_weight: float = Form(...),
    preferred_location: str = Form(...),
    preferred_yard: str = Form(...),
    processes: str = Form(...),  # JSON-encoded list of strings
    block_breakdown: str = Form(...),
    project_ref: UploadFile = File(...),
    human_plan: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Save project details form data and store both uploaded CSV files.

    Accepts multipart/form-data.
    Returns the updated project summary with any CSV column warnings.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file extensions
    for upload in (project_ref, human_plan):
        if upload.filename and not upload.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=422,
                detail=f"Only .csv files are accepted for {upload.filename}",
            )

    # Save uploaded files to uploads/
    storage_service = StorageService()
    ref_content = await project_ref.read()
    human_content = await human_plan.read()
    storage_service.save_uploaded_file(ref_content, project_ref.filename or "project_ref.csv")
    storage_service.save_uploaded_file(human_content, human_plan.filename or "human_plan.csv")

    # Validate CSV columns and collect warnings
    required_columns = {
        "project_id",
        "project_name",
        "duration_days",
        "start_date",
        "end_date",
        "resource",
        "dependencies",
        "cost",
        "priority",
    }
    warnings: list[str] = []
    for label, content in (("project_ref", ref_content), ("human_plan", human_content)):
        try:
            lines = content.decode("utf-8", errors="replace").splitlines()
            if lines:
                header_cols = {c.strip().lower() for c in lines[0].split(",")}
                missing = required_columns - header_cols
                if missing:
                    warnings.append(
                        f"{label}: Missing required columns: {', '.join(sorted(missing))}"
                    )
        except Exception:
            warnings.append(f"{label}: Could not parse CSV headers")

    # Parse and persist project fields
    import json as _json

    try:
        processes_list = _json.loads(processes)
    except Exception:
        processes_list = [p.strip() for p in processes.split(",") if p.strip()]

    project.project_type = project_type
    project.name = project_name
    project.hull_length = hull_length
    project.hull_width = hull_width
    project.hull_height = hull_height
    project.topside_weight = topside_weight
    project.preferred_location = preferred_location
    project.preferred_yard = preferred_yard
    project.processes = processes_list
    project.block_breakdown = block_breakdown
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "name": project.name,
        "project_type": project.project_type,
        "warnings": warnings,
    }


@project_router.post("/{project_id}/yard-availability")  # STUB
async def yard_availability_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
):
    """Return simulated yard availability after a 10–20 s delay. (STUB)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    yards = await simulate_yard_availability()
    return {"yards": yards}


@project_router.post("/{project_id}/capacity-plan")  # STUB
async def capacity_plan_endpoint(
    project_id: int,
    request: CapacityPlanRequest,
    db: Session = Depends(get_db),
):
    """Return simulated capacity plan after a 10–20 s delay. (STUB)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await simulate_capacity_plan(
        selected_yards=request.selected_yards,
        prompt=request.prompt,
    )
    return result


@project_router.post("/{project_id}/plan-edit/parse")
async def parse_nl_edit(
    project_id: int,
    request: NLEditRequest,
    db: Session = Depends(get_db),
) -> NLEditAction:
    """Parse a natural-language plan-edit command into a structured action.

    Supported format: ``change PRJ-XXX from RESOURCE-A to RESOURCE-B``

    Returns ``NLEditAction`` on success or HTTP 422 on unrecognised pattern.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    action = parse_nl_command(request.command)
    if action is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "Unsupported command. "
                "Supported format: change PRJ-XXX from RESOURCE-A to RESOURCE-B"
            ),
        )
    return NLEditAction(**action)


@project_router.put("/{project_id}/plan")
async def upsert_plan(
    project_id: int,
    request: PlanUpdateRequest,
    db: Session = Depends(get_db),
):
    """Upsert the AI capacity plan for a project.

    If a Plan row already exists for the project, updates ``plan_data_json`` in place.
    If no Plan row exists, creates a new ``AI_GENERATED`` Plan row first.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    plan = db.query(Plan).filter(Plan.project_id == project_id).first()
    if plan is None:
        plan = Plan(
            name="AI Capacity Plan",
            lineage=PlanLineageType.AI_GENERATED,
            project_id=project_id,
        )
        db.add(plan)

    plan.plan_data_json = [row.model_dump() for row in request.rows]
    plan.status = PlanStatus.COMPLETED
    db.commit()
    db.refresh(plan)

    return {"id": plan.id, "project_id": project_id, "rows": len(request.rows)}


@planning_router.post("/upload")
async def upload_plan(
    file: UploadFile = File(...),
    name: str = Form(...),
    project_id: int = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload planning data file (CSV or Excel)
    Parses file and creates initial plan record
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in [".csv", ".xlsx", ".xls"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {file_ext}. Please upload CSV or Excel files.",
        )

    try:
        if not name.strip():
            raise HTTPException(status_code=400, detail="Plan name is required")

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Save uploaded file
        storage_service = StorageService()
        file_content = await file.read()
        file_path = storage_service.save_uploaded_file(file_content, file.filename)

        # Parse spreadsheet
        parser = SpreadsheetParser()
        plan_data = parser.parse_file(file_path)

        # Create plan record
        tasks = [TaskSchema(**task) for task in plan_data.get("tasks", [])]
        resources = [ResourceSchema(**res) for res in plan_data.get("resources", [])]

        plan_schema = PlanSchema(
            project_id=project_id,
            name=name,
            description=description or "Uploaded human plan",
            status=PlanStatus.UPLOADED.value,
            lineage=PlanLineageType.HUMAN_CREATED.value,
            total_duration_days=sum(t.duration_days for t in tasks),
            tasks=tasks,
            resources=resources,
            assumptions=[],
            recommendations=[],
            source_file_path=file_path,
            source_file_name=file.filename,
            plan_data_json={
                "source_file_path": file_path,
                "source_file_name": file.filename,
                "uploaded_at": str(datetime.datetime.now(datetime.timezone.utc)),
            },
        )

        # Save to database
        plan_id = storage_service.save_plan_to_db(plan_schema)

        return {
            "plan_id": plan_id,
            "name": name,
            "status": PlanStatus.UPLOADED.value,
            "tasks_count": len(tasks),
            "resources_count": len(resources),
            "message": "Plan uploaded successfully",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@planning_router.post("/{plan_id}/generate")
async def generate_plan(
    plan_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """
    Generate AI-optimized plan from uploaded data
    Uses Agent Framework and Azure OpenAI for reasoning
    """
    # Get existing plan
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

    # Update status to generating
    plan.status = PlanStatus.GENERATING.value
    db.commit()

    try:
        # Initialize services
        storage_service = StorageService()

        # Check if AI service is configured
        if settings.azure_openai_endpoint and settings.azure_openai_api_key:
            ai_service = AzureOpenAIService(
                endpoint=settings.azure_openai_endpoint,
                api_key=settings.azure_openai_api_key,
                model=settings.azure_openai_model,
                timeout=settings.plan_generation_timeout,
            )
        else:
            # Use mock service for development
            ai_service = MockAIService()

        parser = SpreadsheetParser()

        # Create planning agent
        agent = await create_planning_agent(parser=parser, ai_service=ai_service)

        # Execute planning workflow
        result = await agent.execute_planning_workflow(
            file_path=plan.source_file_path,
            plan_name=f"{plan.name} (AI Generated)",
            constraints=None,  # Could pass from request body
            optimization_goals=["minimize_duration", "maximize_capacity"],
        )

        if not result["success"]:
            # Handle infeasible plan
            plan.status = PlanStatus.FAILED.value
            db.commit()

            return {
                "plan_id": plan_id,
                "status": "infeasible",
                "violations": result.get("violations", []),
                "relaxation_suggestions": result.get("relaxation_suggestions", []),
                "message": "Plan is infeasible. Review suggested constraint relaxations.",
            }

        # Create AI-generated plan
        ai_plan_data = add_explanations_to_plan(
            result["plan_data"],
            result.get("reasoning_trace", ""),
            result.get("assumptions", []),
        )
        ai_plan_data = apply_constraints_to_plan_data(ai_plan_data, {})
        metrics = result["metrics"]

        # Convert to schemas
        ai_tasks = [
            TaskSchema(**{**task, "lineage": PlanLineageType.AI_GENERATED.value})
            for task in ai_plan_data.get("tasks", [])
        ]
        ai_resources = [ResourceSchema(**res) for res in ai_plan_data.get("resources", [])]
        ai_assumptions = [AssumptionSchema(**asmp) for asmp in result.get("assumptions", [])]
        ai_recommendations = [
            RecommendationSchema(**rec) for rec in result.get("recommendations", [])
        ]

        ai_plan_schema = PlanSchema(
            project_id=plan.project_id,
            base_plan_id=plan_id,
            name=result["plan_name"],
            description=f"AI-optimized version of {plan.name}",
            status=PlanStatus.COMPLETED.value,
            lineage=PlanLineageType.AI_GENERATED.value,
            total_duration_days=metrics.get("total_duration_days", 0),
            capacity_utilization=metrics.get("capacity_utilization", 0),
            total_cost=metrics.get("total_cost", 0),
            tasks=ai_tasks,
            resources=ai_resources,
            assumptions=ai_assumptions,
            recommendations=ai_recommendations,
            source_file_path=plan.source_file_path,
            plan_data_json=build_plan_version_metadata(
                base_plan_id=plan_id,
                constraints={},
                reasoning_trace=result.get("reasoning_trace", ""),
            ),
        )

        # Save AI plan to database
        ai_plan_id = storage_service.save_plan_to_db(ai_plan_schema)

        # Update original plan status
        plan.status = PlanStatus.COMPLETED.value
        db.commit()

        return {
            "plan_id": ai_plan_id,
            "original_plan_id": plan_id,
            "name": ai_plan_schema.name,
            "status": PlanStatus.COMPLETED.value,
            "metrics": metrics,
            "model_used": result.get("model_used", "unknown"),
            "message": "AI plan generated successfully",
        }

    except Exception as e:
        plan.status = PlanStatus.FAILED.value
        db.commit()
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {str(e)}")


@planning_router.get("/{plan_id}")
async def get_plan(plan_id: int, db: Session = Depends(get_db)):
    """Get plan by ID with all related data"""
    storage_service = StorageService()

    try:
        plan = storage_service.get_plan_by_id(plan_id, db)
        if not plan:
            raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

        return plan

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve plan: {str(e)}")


@planning_router.get("/{plan_id}/details")
async def get_plan_details(plan_id: int, db: Session = Depends(get_db)):
    """Get plan details including explanations and assumptions"""
    storage_service = StorageService()

    try:
        plan = storage_service.get_plan_by_id(plan_id, db)
        if not plan:
            raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")
        return plan
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve plan: {str(e)}")


@planning_router.post("/compare")
async def compare_plans(request: PlanComparisonRequest, db: Session = Depends(get_db)):
    """Compare two plans and return differences and trade-offs"""
    storage_service = StorageService()
    comparison_service = PlanComparisonService()

    plan_a = storage_service.get_plan_by_id(request.plan_id_1, db)
    plan_b = storage_service.get_plan_by_id(request.plan_id_2, db)

    if not plan_a or not plan_b:
        raise HTTPException(status_code=404, detail="One or both plans not found")

    return comparison_service.compare_plans(plan_a, plan_b)


@planning_router.post("/{plan_id}/constraints")
async def update_constraints(
    plan_id: int,
    request: ConstraintUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update constraints and optionally regenerate plan"""
    storage_service = StorageService()
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

    if not request.regenerate:
        plan.plan_data_json = {"constraints": request.constraints}
        db.commit()
        return {"message": "Constraints updated", "plan_id": plan_id}

    if not plan.source_file_path:
        raise HTTPException(
            status_code=400,
            detail="Original source file not found; cannot regenerate plan",
        )

    # Initialize services
    if settings.azure_openai_endpoint and settings.azure_openai_api_key:
        ai_service = AzureOpenAIService(
            endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
            model=settings.azure_openai_model,
            timeout=settings.plan_generation_timeout,
        )
    else:
        ai_service = MockAIService()

    parser = SpreadsheetParser()
    agent = await create_planning_agent(parser=parser, ai_service=ai_service)

    result = await agent.execute_planning_workflow(
        file_path=plan.source_file_path,
        plan_name=f"{plan.name} (Iteration)",
        constraints=request.constraints,
        optimization_goals=["minimize_duration", "maximize_capacity"],
    )

    if not result.get("success"):
        raise HTTPException(status_code=422, detail="Constraint update produced infeasible plan")

    ai_plan_data = add_explanations_to_plan(
        result["plan_data"],
        result.get("reasoning_trace", ""),
        result.get("assumptions", []),
    )
    ai_plan_data = apply_constraints_to_plan_data(ai_plan_data, request.constraints)

    ai_tasks = [
        TaskSchema(**{**task, "lineage": PlanLineageType.AI_GENERATED.value})
        for task in ai_plan_data.get("tasks", [])
    ]
    ai_resources = [ResourceSchema(**res) for res in ai_plan_data.get("resources", [])]
    ai_assumptions = [AssumptionSchema(**asmp) for asmp in result.get("assumptions", [])]
    ai_recommendations = [RecommendationSchema(**rec) for rec in result.get("recommendations", [])]

    metrics = result.get("metrics", {})

    ai_plan_schema = PlanSchema(
        project_id=plan.project_id,
        base_plan_id=plan_id,
        name=result["plan_name"],
        description=f"Constraint iteration based on {plan.name}",
        status=PlanStatus.COMPLETED.value,
        lineage=PlanLineageType.AI_GENERATED.value,
        total_duration_days=metrics.get("total_duration_days", 0),
        capacity_utilization=metrics.get("capacity_utilization", 0),
        total_cost=metrics.get("total_cost", 0),
        tasks=ai_tasks,
        resources=ai_resources,
        assumptions=ai_assumptions,
        recommendations=ai_recommendations,
        source_file_path=plan.source_file_path,
        plan_data_json=build_plan_version_metadata(
            base_plan_id=plan_id,
            constraints=request.constraints,
            reasoning_trace=result.get("reasoning_trace", ""),
        ),
    )

    new_plan_id = storage_service.save_plan_to_db(ai_plan_schema)
    return storage_service.get_plan_by_id(new_plan_id, db)


@planning_router.post("/{plan_id}/recommendations/{recommendation_id}")
async def decide_recommendation(
    plan_id: int,
    recommendation_id: int,
    request: RecommendationDecisionRequest,
    db: Session = Depends(get_db),
):
    """Accept or reject a recommendation for a plan"""
    try:
        result = apply_recommendation_decision(
            db=db,
            plan_id=plan_id,
            recommendation_id=recommendation_id,
            accept=request.accept,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    recommendation = result["recommendation"]
    return RecommendationDecisionResponse(
        plan_id=plan_id,
        recommendation_id=recommendation_id,
        status=recommendation.status,
        updated_task_ids=result["updated_task_ids"],
    )


@planning_router.get("/{plan_id}/export")
async def export_plan(plan_id: int, format: str, db: Session = Depends(get_db)):
    """Export plan data as CSV, JSON, or Gantt JSON"""
    storage_service = StorageService()
    plan = storage_service.get_plan_by_id(plan_id, db)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

    export_format = format.lower()
    if export_format == "csv":
        output = io.StringIO()
        fieldnames = [
            "task_id",
            "name",
            "start_date",
            "end_date",
            "duration_days",
            "priority",
            "cost",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for task in plan.tasks:
            writer.writerow(
                {
                    "task_id": task.task_id,
                    "name": task.name,
                    "start_date": task.start_date.isoformat() if task.start_date else "",
                    "end_date": task.end_date.isoformat() if task.end_date else "",
                    "duration_days": task.duration_days,
                    "priority": task.priority,
                    "cost": task.cost,
                }
            )

        data = output.getvalue().encode("utf-8")
        filename = f"plan_{plan_id}.csv"
        media_type = "text/csv"
    elif export_format == "json":
        payload = json.dumps(plan.model_dump(), default=str, indent=2).encode("utf-8")
        filename = f"plan_{plan_id}.json"
        media_type = "application/json"
        data = payload
    elif export_format == "gantt":
        gantt_payload = {
            "plan_id": plan_id,
            "name": plan.name,
            "tasks": [
                {
                    "id": task.task_id,
                    "name": task.name,
                    "start": task.start_date,
                    "end": task.end_date,
                    "duration_days": task.duration_days,
                }
                for task in plan.tasks
            ],
        }
        payload = json.dumps(gantt_payload, default=str, indent=2).encode("utf-8")
        filename = f"plan_{plan_id}_gantt.json"
        media_type = "application/json"
        data = payload
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# Include routers in main API router
api_router.include_router(health_router)
api_router.include_router(planning_router)
api_router.include_router(project_router)
