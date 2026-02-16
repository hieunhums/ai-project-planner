"""
API route definitions for AI Planning Assistant
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
from pathlib import Path

from .models import SuccessResponse, ErrorResponse
from ..db import get_db
from ..config import get_settings
from ..services.storage_service import StorageService
from ..services.planning_service import SpreadsheetParser, PlanGenerator
from ..services.ai_service import MockAIService, AzureOpenAIService
from ..agents.planning_agent import create_planning_agent
from ..models.database import Plan, PlanStatus, PlanLineageType
from ..models.schemas import PlanSchema, TaskSchema, ResourceSchema, AssumptionSchema, RecommendationSchema

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


@planning_router.post("/upload")
async def upload_plan(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload planning data file (CSV or Excel)
    Parses file and creates initial plan record
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ['.csv', '.xlsx', '.xls']:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {file_ext}. Please upload CSV or Excel files."
        )
    
    try:
        # Save uploaded file
        storage_service = StorageService()
        file_content = await file.read()
        file_path = storage_service.save_uploaded_file(file_content, file.filename)
        
        # Parse spreadsheet
        parser = SpreadsheetParser()
        plan_data = parser.parse_file(file_path)
        
        # Create plan record
        tasks = [TaskSchema(**task) for task in plan_data.get('tasks', [])]
        resources = [ResourceSchema(**res) for res in plan_data.get('resources', [])]
        
        plan_schema = PlanSchema(
            name=name,
            description=description or "Uploaded human plan",
            status=PlanStatus.UPLOADED.value,
            lineage=PlanLineageType.HUMAN_CREATED.value,
            total_duration_days=sum(t.duration_days for t in tasks),
            tasks=tasks,
            resources=resources,
            assumptions=[],
            recommendations=[],
        )
        
        # Save to database
        plan_id = storage_service.save_plan_to_db(plan_schema)
        
        return {
            "plan_id": plan_id,
            "name": name,
            "status": PlanStatus.UPLOADED.value,
            "tasks_count": len(tasks),
            "resources_count": len(resources),
            "message": "Plan uploaded successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@planning_router.post("/{plan_id}/generate")
async def generate_plan(
    plan_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
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
                timeout=settings.plan_generation_timeout
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
            optimization_goals=['minimize_duration', 'maximize_capacity']
        )
        
        if not result['success']:
            # Handle infeasible plan
            plan.status = PlanStatus.FAILED.value
            db.commit()
            
            return {
                "plan_id": plan_id,
                "status": "infeasible",
                "violations": result.get('violations', []),
                "relaxation_suggestions": result.get('relaxation_suggestions', []),
                "message": "Plan is infeasible. Review suggested constraint relaxations."
            }
        
        # Create AI-generated plan
        ai_plan_data = result['plan_data']
        metrics = result['metrics']
        
        # Convert to schemas
        ai_tasks = [TaskSchema(**{**task, 'lineage': PlanLineageType.AI_GENERATED.value}) 
                    for task in ai_plan_data.get('tasks', [])]
        ai_resources = [ResourceSchema(**res) for res in ai_plan_data.get('resources', [])]
        ai_assumptions = [AssumptionSchema(**asmp) for asmp in result.get('assumptions', [])]
        ai_recommendations = [RecommendationSchema(**rec) for rec in result.get('recommendations', [])]
        
        ai_plan_schema = PlanSchema(
            name=result['plan_name'],
            description=f"AI-optimized version of {plan.name}",
            status=PlanStatus.COMPLETED.value,
            lineage=PlanLineageType.AI_GENERATED.value,
            total_duration_days=metrics.get('total_duration_days', 0),
            capacity_utilization=metrics.get('capacity_utilization', 0),
            total_cost=metrics.get('total_cost', 0),
            tasks=ai_tasks,
            resources=ai_resources,
            assumptions=ai_assumptions,
            recommendations=ai_recommendations,
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
            "model_used": result.get('model_used', 'unknown'),
            "message": "AI plan generated successfully"
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


# Include routers in main API router
api_router.include_router(health_router)
api_router.include_router(planning_router)
