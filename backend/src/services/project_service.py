"""
Project service for managing project data and summaries
"""

from typing import List
from sqlalchemy.orm import Session

from ..models.database import Project, Plan, PlanLineageType, PlanStatus
from ..models.schemas import ProjectSummary, ProjectDetail, UploadSummary, GeneratedPlanSummary


STATUS_LABELS = {
    PlanStatus.UPLOADED.value: "Uploaded",
    PlanStatus.PARSING.value: "Parsing",
    PlanStatus.GENERATING.value: "Generating",
    PlanStatus.COMPLETED.value: "Completed",
    PlanStatus.FAILED.value: "Failed",
}


def list_projects(db: Session) -> List[ProjectSummary]:
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return [
        ProjectSummary(
            id=project.id,
            name=project.name,
            created_at=project.created_at,
            project_type=project.project_type or "confirmed",
        )
        for project in projects
    ]


def create_project(db: Session, name: str) -> ProjectSummary:
    trimmed = name.strip()
    if not trimmed:
        raise ValueError("Project name is required")

    project = Project(name=trimmed)
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectSummary(
        id=project.id,
        name=project.name,
        created_at=project.created_at,
        project_type=project.project_type or "confirmed",
    )


def get_project_detail(db: Session, project_id: int) -> ProjectDetail:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found")

    plans = db.query(Plan).filter(Plan.project_id == project_id).order_by(Plan.created_at.desc())
    uploads = []
    generated_plans = []

    for plan in plans:
        status_label = STATUS_LABELS.get(plan.status, "Unknown")
        if plan.lineage == PlanLineageType.HUMAN_CREATED.value:
            uploads.append(
                UploadSummary(
                    plan_id=plan.id,
                    file_name=plan.source_file_name or plan.name,
                    uploaded_at=plan.created_at,
                    status_label=status_label,
                )
            )
        elif plan.lineage == PlanLineageType.AI_GENERATED.value:
            generated_plans.append(
                GeneratedPlanSummary(
                    plan_id=plan.id,
                    name=plan.name,
                    generated_at=plan.created_at,
                    status_label=status_label,
                )
            )

    return ProjectDetail(
        id=project.id,
        name=project.name,
        uploads=uploads,
        generated_plans=generated_plans,
    )


def delete_project(db: Session, project_id: int) -> None:
    """Delete a project and all associated plans"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found")

    # Delete all plans associated with the project (cascade)
    db.query(Plan).filter(Plan.project_id == project_id).delete()

    # Delete the project
    db.delete(project)
    db.commit()
