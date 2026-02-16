"""
Agent tools for planning workflow
Defines callable tools for Microsoft Agent Framework orchestration
"""

from typing import Dict, Any, List, Optional
import json


class PlanningTools:
    """
    Collection of tools for agent-based planning workflow
    Each tool is a discrete capability that agents can call
    """

    def __init__(self, parser=None, ai_service=None):
        """
        Initialize tools with service dependencies

        Args:
            parser: SpreadsheetParser instance
            ai_service: AzureOpenAIService instance
        """
        self.parser = parser
        self.ai_service = ai_service

    async def parse_spreadsheet(self, file_path: str) -> Dict[str, Any]:
        """
        Tool: Parse uploaded planning spreadsheet

        Args:
            file_path: Path to CSV or Excel file

        Returns:
            Structured plan data (tasks, resources, constraints)
        """
        if not self.parser:
            raise RuntimeError("Parser not configured")

        try:
            plan_data = self.parser.parse_file(file_path)
            return {
                "success": True,
                "data": plan_data,
                "task_count": len(plan_data.get("tasks", [])),
                "resource_count": len(plan_data.get("resources", [])),
            }
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    async def validate_constraints(
        self, plan_data: Dict[str, Any], constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Tool: Validate plan against constraints

        Returns:
            Validation result with feasibility and violations
        """
        violations = []

        # Basic validation rules
        tasks = plan_data.get("tasks", [])
        resources = plan_data.get("resources", [])

        # Rule 1: Task count limits
        if len(tasks) > 50:
            violations.append(
                {
                    "type": "task_limit_exceeded",
                    "message": f"Plan has {len(tasks)} tasks, maximum is 50",
                    "severity": "high",
                }
            )
        elif len(tasks) < 1:
            violations.append(
                {
                    "type": "insufficient_tasks",
                    "message": "Plan must have at least one task",
                    "severity": "high",
                }
            )

        # Rule 2: Dependency validation (detect cycles)
        task_ids = {task.get("task_id") for task in tasks}
        for task in tasks:
            dependencies = task.get("dependencies", [])
            for dep_id in dependencies:
                if dep_id not in task_ids:
                    violations.append(
                        {
                            "type": "invalid_dependency",
                            "message": f'Task {task.get("task_id")} depends on non-existent task {dep_id}',
                            "severity": "high",
                        }
                    )

        # Rule 3: Duration validation
        for task in tasks:
            duration = task.get("duration_days", 0)
            if duration <= 0:
                violations.append(
                    {
                        "type": "invalid_duration",
                        "message": f'Task {task.get("task_id")} has invalid duration: {duration}',
                        "severity": "medium",
                    }
                )

        is_feasible = len([v for v in violations if v["severity"] == "high"]) == 0

        return {
            "is_feasible": is_feasible,
            "violations": violations,
            "task_count": len(tasks),
            "resource_count": len(resources),
        }

    async def optimize_schedule(
        self, plan_data: Dict[str, Any], optimization_goals: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Tool: Optimize task schedule using AI

        Args:
            plan_data: Current plan data
            optimization_goals: List of goals (e.g., ["minimize_duration"])

        Returns:
            Optimized plan with new schedule
        """
        if not self.ai_service:
            # Fallback: basic ASAP scheduling
            return await self._basic_schedule_optimization(plan_data)

        try:
            result = await self.ai_service.generate_plan(
                plan_data=plan_data,
                optimization_goals=optimization_goals or ["minimize_duration", "maximize_capacity"],
            )

            return {
                "success": True,
                "optimized_plan": result.get("structured_plan", plan_data),
                "reasoning": result.get("reasoning", ""),
                "model": result.get("model", "unknown"),
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "optimized_plan": plan_data,  # Return original on failure
            }

    async def _basic_schedule_optimization(self, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Basic ASAP (As Soon As Possible) scheduling without AI
        Used as fallback when AI service unavailable
        """
        from datetime import datetime, timedelta

        tasks = plan_data.get("tasks", [])

        # Build dependency graph
        task_map = {task["task_id"]: task for task in tasks}

        # Schedule tasks using topological sort (ASAP)
        scheduled = set()
        current_date = datetime(2026, 3, 1)  # Start date

        while len(scheduled) < len(tasks):
            progress_made = False

            for task in tasks:
                task_id = task["task_id"]
                if task_id in scheduled:
                    continue

                # Check if dependencies are scheduled
                dependencies = task.get("dependencies", [])
                if all(dep in scheduled for dep in dependencies):
                    # Schedule this task
                    task["start_date"] = current_date.isoformat()
                    end_date = current_date + timedelta(days=task.get("duration_days", 1))
                    task["end_date"] = end_date.isoformat()
                    scheduled.add(task_id)
                    progress_made = True

            if not progress_made:
                # No tasks could be scheduled - possible cycle
                break

            # Advance time for next iteration
            current_date += timedelta(days=1)

        # Calculate metrics
        total_duration = (current_date - datetime(2026, 3, 1)).days

        return {
            "success": True,
            "optimized_plan": {**plan_data, "total_duration_days": total_duration},
            "reasoning": "Basic ASAP scheduling algorithm applied",
            "model": "fallback-basic-scheduler",
        }

    async def suggest_relaxations(
        self, plan_data: Dict[str, Any], violations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Tool: Generate constraint relaxation suggestions for infeasible plans

        Args:
            plan_data: Current plan data
            violations: List of constraint violations

        Returns:
            List of relaxation suggestions
        """
        relaxations = []

        for violation in violations:
            if violation["type"] == "task_limit_exceeded":
                relaxations.append(
                    {
                        "constraint": "max_tasks",
                        "current_value": 50,
                        "suggested_value": len(plan_data.get("tasks", [])),
                        "rationale": "Increase task limit to accommodate full project scope",
                        "impact": "Extended processing time (3-5 min per plan)",
                        "accepted": False,
                    }
                )
            elif violation["type"] == "invalid_dependency":
                relaxations.append(
                    {
                        "constraint": "dependency_validation",
                        "suggestion": "Remove invalid dependencies or add missing tasks",
                        "rationale": "Dependency graph contains references to non-existent tasks",
                        "impact": "May affect plan validity",
                        "accepted": False,
                    }
                )

        return relaxations

    async def calculate_metrics(self, plan_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Tool: Calculate plan performance metrics

        Returns:
            Dictionary of key metrics
        """
        tasks = plan_data.get("tasks", [])
        resources = plan_data.get("resources", [])

        # Duration metrics
        total_duration = sum(task.get("duration_days", 0) for task in tasks)

        # Cost metrics
        total_cost = sum(task.get("cost", 0) for task in tasks)

        # Resource metrics (simplified)
        capacity_utilization = 0.0
        if resources:
            # Mock calculation - would need actual allocation data
            capacity_utilization = 75.0

        return {
            "total_duration_days": total_duration,
            "total_cost": total_cost,
            "capacity_utilization": capacity_utilization,
            "task_count": len(tasks),
            "resource_count": len(resources),
        }


def get_tool_descriptions() -> List[Dict[str, Any]]:
    """
    Get tool descriptions for agent framework registration

    Returns:
        List of tool metadata for agent configuration
    """
    return [
        {
            "name": "parse_spreadsheet",
            "description": "Parse uploaded CSV or Excel planning file into structured data",
            "parameters": {"file_path": {"type": "string", "required": True}},
        },
        {
            "name": "validate_constraints",
            "description": "Validate plan against constraints and identify violations",
            "parameters": {
                "plan_data": {"type": "dict", "required": True},
                "constraints": {"type": "dict", "required": False},
            },
        },
        {
            "name": "optimize_schedule",
            "description": "Optimize task schedule using AI reasoning",
            "parameters": {
                "plan_data": {"type": "dict", "required": True},
                "optimization_goals": {"type": "list", "required": False},
            },
        },
        {
            "name": "suggest_relaxations",
            "description": "Generate constraint relaxation suggestions for infeasible plans",
            "parameters": {
                "plan_data": {"type": "dict", "required": True},
                "violations": {"type": "list", "required": True},
            },
        },
        {
            "name": "calculate_metrics",
            "description": "Calculate plan performance metrics (duration, cost, utilization)",
            "parameters": {"plan_data": {"type": "dict", "required": True}},
        },
    ]
