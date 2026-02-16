"""
Storage service for file and database operations
Handles file uploads, plan persistence, and lineage metadata tracking
"""

import os
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

from ..config import get_settings
from ..db import get_db_context
from ..models.database import Plan, Task, Resource, Assumption, Recommendation
from ..models.schemas import PlanSchema

settings = get_settings()


class StorageService:
    """Service for managing file storage and database persistence"""

    def __init__(self):
        self.upload_dir = Path(settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """
        Save uploaded file to local storage
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            
        Returns:
            Full path to saved file
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{filename}"
        file_path = self.upload_dir / safe_filename

        with open(file_path, "wb") as f:
            f.write(file_content)

        return str(file_path)

    def save_plan_to_db(self, plan_schema: PlanSchema) -> int:
        """
        Save plan and related entities to database
        Tracks lineage metadata for AI/human/hybrid elements
        
        Args:
            plan_schema: Plan data schema
            
        Returns:
            Plan ID
        """
        with get_db_context() as db:
            # Create plan
            plan = Plan(
                name=plan_schema.name,
                description=plan_schema.description,
                status=plan_schema.status,
                lineage=plan_schema.lineage,
                total_duration_days=plan_schema.total_duration_days,
                capacity_utilization=plan_schema.capacity_utilization,
                total_cost=plan_schema.total_cost,
            )
            db.add(plan)
            db.flush()  # Get plan ID

            # Save tasks
            for task_schema in plan_schema.tasks:
                task = Task(
                    plan_id=plan.id,
                    task_id=task_schema.task_id,
                    name=task_schema.name,
                    duration_days=task_schema.duration_days,
                    start_date=task_schema.start_date,
                    end_date=task_schema.end_date,
                    resource_requirements=task_schema.resource_requirements,
                    dependencies={"deps": task_schema.dependencies or []},
                    constraints=task_schema.constraints,
                    priority=task_schema.priority,
                    cost=task_schema.cost,
                    lineage=task_schema.lineage,
                )
                db.add(task)

            # Save resources
            for resource_schema in plan_schema.resources:
                resource = Resource(
                    plan_id=plan.id,
                    resource_id=resource_schema.resource_id,
                    name=resource_schema.name,
                    type=resource_schema.type,
                    capacity=resource_schema.capacity,
                    availability_start=resource_schema.availability_start,
                    availability_end=resource_schema.availability_end,
                    hourly_cost=resource_schema.hourly_cost,
                    skills={"skills": resource_schema.skills or []},
                )
                db.add(resource)

            # Save assumptions
            for assumption_schema in plan_schema.assumptions:
                assumption = Assumption(
                    plan_id=plan.id,
                    assumption_type=assumption_schema.assumption_type,
                    description=assumption_schema.description,
                    value=assumption_schema.value,
                )
                db.add(assumption)

            # Save recommendations
            for rec_schema in plan_schema.recommendations:
                recommendation = Recommendation(
                    plan_id=plan.id,
                    recommendation_type=rec_schema.recommendation_type,
                    affected_entities=rec_schema.affected_entities,
                    rationale=rec_schema.rationale,
                    impact_metrics=rec_schema.impact_metrics,
                    status=rec_schema.status,
                )
                db.add(recommendation)

            db.commit()
            return plan.id

    def get_plan_by_id(self, plan_id: int) -> Optional[PlanSchema]:
        """
        Retrieve plan with all related entities from database
        
        Args:
            plan_id: Plan ID
            
        Returns:
            PlanSchema or None if not found
        """
        with get_db_context() as db:
            plan = db.query(Plan).filter(Plan.id == plan_id).first()
            if not plan:
                return None

            # Load related entities
            tasks = db.query(Task).filter(Task.plan_id == plan_id).all()
            resources = db.query(Resource).filter(Resource.plan_id == plan_id).all()
            assumptions = db.query(Assumption).filter(Assumption.plan_id == plan_id).all()
            recommendations = (
                db.query(Recommendation).filter(Recommendation.plan_id == plan_id).all()
            )

            # Convert to schema
            return PlanSchema.model_validate(
                {
                    **plan.__dict__,
                    "tasks": [t.__dict__ for t in tasks],
                    "resources": [r.__dict__ for r in resources],
                    "assumptions": [a.__dict__ for a in assumptions],
                    "recommendations": [rec.__dict__ for rec in recommendations],
                }
            )

    def delete_uploaded_file(self, file_path: str):
        """Delete uploaded file from storage"""
        try:
            Path(file_path).unlink()
        except FileNotFoundError:
            pass
