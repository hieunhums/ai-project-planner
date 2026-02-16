"""
Planning agent orchestrator using Microsoft Agent Framework patterns
Coordinates multi-step planning workflow with tools and AI reasoning
"""

from typing import Dict, Any, List, Optional
import asyncio
import json

from .tools import PlanningTools


class PlanningAgent:
    """
    Orchestrates planning workflow using agent pattern
    Coordinates parsing, validation, optimization, and constraint handling
    """

    def __init__(self, tools: PlanningTools, ai_service=None, max_iterations: int = 3):
        """
        Initialize planning agent

        Args:
            tools: PlanningTools instance with callable capabilities
            ai_service: Optional AI service for advanced reasoning
            max_iterations: Maximum optimization iterations
        """
        self.tools = tools
        self.ai_service = ai_service
        self.max_iterations = max_iterations
        self.execution_log = []

    async def execute_planning_workflow(
        self,
        file_path: str,
        plan_name: str,
        constraints: Optional[Dict[str, Any]] = None,
        optimization_goals: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Execute complete planning workflow

        Workflow steps:
        1. Parse spreadsheet
        2. Validate constraints
        3. If feasible: optimize schedule
        4. If infeasible: suggest constraint relaxations
        5. Calculate final metrics
        6. Generate recommendations

        Args:
            file_path: Path to uploaded planning file
            plan_name: Name for generated plan
            constraints: Optional additional constraints
            optimization_goals: List of optimization objectives

        Returns:
            Complete plan result with tasks, metrics, assumptions, recommendations
        """
        self.execution_log = []
        self._log_step("workflow_started", {"file_path": file_path, "plan_name": plan_name})

        # Step 1: Parse spreadsheet
        self._log_step("parsing_file", {"file_path": file_path})
        parse_result = await self.tools.parse_spreadsheet(file_path)

        if not parse_result.get("success"):
            return self._create_error_result(
                "parse_failed", parse_result.get("error", "Unknown parsing error")
            )

        plan_data = parse_result["data"]
        self._log_step(
            "parse_complete",
            {
                "task_count": parse_result["task_count"],
                "resource_count": parse_result["resource_count"],
            },
        )

        # Step 2: Validate constraints
        self._log_step("validating_constraints", {})
        validation_result = await self.tools.validate_constraints(plan_data, constraints)
        self._log_step("validation_complete", validation_result)

        # Step 3: Handle infeasibility
        if not validation_result["is_feasible"]:
            self._log_step("plan_infeasible", {"violations": validation_result["violations"]})

            # Generate constraint relaxation suggestions
            relaxations = await self.tools.suggest_relaxations(
                plan_data, validation_result["violations"]
            )

            return {
                "success": False,
                "status": "infeasible",
                "violations": validation_result["violations"],
                "relaxation_suggestions": relaxations,
                "execution_log": self.execution_log,
            }

        # Step 4: Optimize schedule
        self._log_step("optimizing_schedule", {"goals": optimization_goals})
        optimization_result = await self.tools.optimize_schedule(plan_data, optimization_goals)

        if not optimization_result.get("success"):
            self._log_step("optimization_failed", {"error": optimization_result.get("error")})
            # Continue with original plan if optimization fails
            optimized_plan = plan_data
        else:
            optimized_plan = optimization_result["optimized_plan"]
            self._log_step(
                "optimization_complete",
                {
                    "model": optimization_result.get("model"),
                    "reasoning_length": len(optimization_result.get("reasoning", "")),
                },
            )

        # Step 5: Calculate metrics
        self._log_step("calculating_metrics", {})
        metrics = await self.tools.calculate_metrics(optimized_plan)
        self._log_step("metrics_calculated", metrics)

        # Step 6: Generate assumptions and recommendations
        assumptions = await self._generate_assumptions(optimized_plan, optimization_result)
        recommendations = await self._generate_recommendations(optimized_plan, metrics)

        # Step 7: Assemble final result
        final_result = {
            "success": True,
            "status": "completed",
            "plan_name": plan_name,
            "plan_data": optimized_plan,
            "metrics": metrics,
            "assumptions": assumptions,
            "recommendations": recommendations,
            "execution_log": self.execution_log,
            "reasoning_trace": optimization_result.get("reasoning", ""),
            "model_used": optimization_result.get("model", "unknown"),
        }

        self._log_step("workflow_completed", {"metrics": metrics})
        return final_result

    async def _generate_assumptions(
        self, plan_data: Dict[str, Any], optimization_result: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Generate list of assumptions made during planning
        These provide transparency into AI reasoning
        """
        assumptions = []

        # Standard assumptions
        assumptions.append(
            {
                "assumption_type": "scheduling_strategy",
                "description": "Tasks scheduled using ASAP (As Soon As Possible) algorithm",
                "value": "asap",
            }
        )

        if optimization_result.get("model") != "fallback-basic-scheduler":
            assumptions.append(
                {
                    "assumption_type": "ai_optimization",
                    "description": f'AI model {optimization_result.get("model")} used for optimization',
                    "value": optimization_result.get("model", "unknown"),
                }
            )

        # Check for resource assumptions
        resources = plan_data.get("resources", [])
        if not resources:
            assumptions.append(
                {
                    "assumption_type": "resource_availability",
                    "description": "Unlimited resources assumed (no resource constraints provided)",
                    "value": "unlimited",
                }
            )

        # Dependency assumptions
        tasks_with_deps = [t for t in plan_data.get("tasks", []) if t.get("dependencies", [])]
        if tasks_with_deps:
            assumptions.append(
                {
                    "assumption_type": "dependency_handling",
                    "description": "Task dependencies strictly enforced in schedule",
                    "value": "strict",
                }
            )

        return assumptions

    async def _generate_recommendations(
        self, plan_data: Dict[str, Any], metrics: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Generate improvement recommendations
        Uses AI service if available, otherwise generates rule-based recommendations
        """
        if self.ai_service:
            try:
                ai_recommendations = await self.ai_service.suggest_improvements(plan_data, metrics)
                return [
                    {
                        "recommendation_type": rec.get("type", "general"),
                        "affected_entities": {},
                        "rationale": rec.get("rationale", ""),
                        "impact_metrics": rec.get("impact", {}),
                        "status": "pending",
                    }
                    for rec in ai_recommendations
                ]
            except Exception as e:
                self._log_step("recommendation_generation_failed", {"error": str(e)})

        # Fallback: rule-based recommendations
        recommendations = []

        # Check for parallelization opportunities
        tasks = plan_data.get("tasks", [])
        tasks_without_deps = [t for t in tasks if not t.get("dependencies", [])]

        if len(tasks_without_deps) > 1:
            recommendations.append(
                {
                    "recommendation_type": "parallelization",
                    "affected_entities": {
                        "task_ids": [t["task_id"] for t in tasks_without_deps[:3]]
                    },
                    "rationale": f"{len(tasks_without_deps)} independent tasks could be parallelized",
                    "impact_metrics": {
                        "estimated_duration_reduction": len(tasks_without_deps) * 0.2
                    },
                    "status": "pending",
                }
            )

        # Check capacity utilization
        if metrics.get("capacity_utilization", 0) < 70:
            recommendations.append(
                {
                    "recommendation_type": "resource_optimization",
                    "affected_entities": {},
                    "rationale": "Low resource utilization detected - consider resource reallocation",
                    "impact_metrics": {"target_utilization": 85.0},
                    "status": "pending",
                }
            )

        return recommendations

    def _log_step(self, step_name: str, data: Dict[str, Any]):
        """Log a workflow execution step"""
        from datetime import datetime

        self.execution_log.append(
            {"step": step_name, "timestamp": datetime.utcnow().isoformat(), "data": data}
        )

    def _create_error_result(self, error_type: str, error_message: str) -> Dict[str, Any]:
        """Create standardized error result"""
        return {
            "success": False,
            "status": "error",
            "error_type": error_type,
            "error_message": error_message,
            "execution_log": self.execution_log,
        }


async def create_planning_agent(parser, ai_service=None, max_iterations: int = 3) -> PlanningAgent:
    """
    Factory function to create configured planning agent

    Args:
        parser: SpreadsheetParser instance
        ai_service: Optional AzureOpenAIService instance
        max_iterations: Maximum optimization iterations

    Returns:
        Configured PlanningAgent ready for workflow execution
    """
    tools = PlanningTools(parser=parser, ai_service=ai_service)
    agent = PlanningAgent(tools=tools, ai_service=ai_service, max_iterations=max_iterations)
    return agent
