"""
Plan comparison service
Generates side-by-side differences and trade-off summaries for two plans
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from ..models.schemas import PlanSchema


class PlanComparisonService:
    """Service to compare two plans and summarize differences"""

    def compare_plans(self, plan_a: PlanSchema, plan_b: PlanSchema) -> Dict[str, Any]:
        """Compare two plans and return structured differences"""
        tasks_a = {task.task_id: task for task in plan_a.tasks}
        tasks_b = {task.task_id: task for task in plan_b.tasks}

        all_task_ids = sorted(set(tasks_a.keys()) | set(tasks_b.keys()))
        task_diffs = []

        for task_id in all_task_ids:
            task_a = tasks_a.get(task_id)
            task_b = tasks_b.get(task_id)

            if task_a is None:
                task_diffs.append(
                    {
                        "task_id": task_id,
                        "name": task_b.name,
                        "status": "added",
                        "changes": [],
                    }
                )
                continue

            if task_b is None:
                task_diffs.append(
                    {
                        "task_id": task_id,
                        "name": task_a.name,
                        "status": "removed",
                        "changes": [],
                    }
                )
                continue

            changes = []
            self._compare_field(
                changes, "duration_days", task_a.duration_days, task_b.duration_days
            )
            self._compare_field(changes, "start_date", task_a.start_date, task_b.start_date)
            self._compare_field(changes, "end_date", task_a.end_date, task_b.end_date)
            self._compare_field(changes, "priority", task_a.priority, task_b.priority)
            self._compare_field(changes, "cost", task_a.cost, task_b.cost)

            status = "modified" if changes else "unchanged"
            task_diffs.append(
                {
                    "task_id": task_id,
                    "name": task_a.name,
                    "status": status,
                    "changes": changes,
                }
            )

        summary = self._build_summary(plan_a, plan_b)
        tradeoffs = self._build_tradeoffs(summary)

        return {
            "plan_id_1": plan_a.id,
            "plan_id_2": plan_b.id,
            "summary": summary,
            "task_differences": task_diffs,
            "tradeoffs": tradeoffs,
            "generated_at": datetime.utcnow().isoformat(),
        }

    def _compare_field(self, changes: List[Dict[str, Any]], field: str, value_a: Any, value_b: Any):
        if value_a != value_b:
            changes.append({"field": field, "plan_1": value_a, "plan_2": value_b})

    def _build_summary(self, plan_a: PlanSchema, plan_b: PlanSchema) -> Dict[str, Any]:
        duration_a = plan_a.total_duration_days or self._sum_duration(plan_a)
        duration_b = plan_b.total_duration_days or self._sum_duration(plan_b)

        cost_a = plan_a.total_cost or self._sum_cost(plan_a)
        cost_b = plan_b.total_cost or self._sum_cost(plan_b)

        capacity_a = plan_a.capacity_utilization or 0
        capacity_b = plan_b.capacity_utilization or 0

        return {
            "duration_delta_days": self._delta(duration_a, duration_b),
            "cost_delta": self._delta(cost_a, cost_b),
            "capacity_delta": self._delta(capacity_a, capacity_b),
            "task_count_delta": len(plan_b.tasks) - len(plan_a.tasks),
            "resource_count_delta": len(plan_b.resources) - len(plan_a.resources),
            "plan_a_metrics": {
                "total_duration_days": duration_a,
                "total_cost": cost_a,
                "capacity_utilization": capacity_a,
            },
            "plan_b_metrics": {
                "total_duration_days": duration_b,
                "total_cost": cost_b,
                "capacity_utilization": capacity_b,
            },
        }

    def _build_tradeoffs(self, summary: Dict[str, Any]) -> List[str]:
        tradeoffs = []

        duration_delta = summary.get("duration_delta_days", 0)
        cost_delta = summary.get("cost_delta", 0)
        capacity_delta = summary.get("capacity_delta", 0)

        if duration_delta < 0:
            tradeoffs.append("AI plan shortens total duration")
        elif duration_delta > 0:
            tradeoffs.append("AI plan increases total duration")

        if cost_delta < 0:
            tradeoffs.append("AI plan reduces total cost")
        elif cost_delta > 0:
            tradeoffs.append("AI plan increases total cost")

        if capacity_delta > 0:
            tradeoffs.append("AI plan improves capacity utilization")
        elif capacity_delta < 0:
            tradeoffs.append("AI plan lowers capacity utilization")

        if not tradeoffs:
            tradeoffs.append("Plans are broadly similar across key metrics")

        return tradeoffs

    def _sum_duration(self, plan: PlanSchema) -> float:
        return float(sum(task.duration_days for task in plan.tasks))

    def _sum_cost(self, plan: PlanSchema) -> float:
        return float(sum(task.cost or 0 for task in plan.tasks))

    def _delta(self, value_a: Optional[float], value_b: Optional[float]) -> float:
        if value_a is None:
            value_a = 0
        if value_b is None:
            value_b = 0
        return float(value_b) - float(value_a)
