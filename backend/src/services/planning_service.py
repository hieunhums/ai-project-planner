"""
Planning service for spreadsheet parsing and plan generation
Handles file parsing, data validation, and orchestration of AI plan generation
"""

import pandas as pd
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta

from ..models.schemas import TaskSchema, ResourceSchema, PlanSchema
from ..models.database import PlanLineageType, PlanStatus


class SpreadsheetParser:
    """
    Flexible spreadsheet parser that infers schema from column headers
    Supports CSV and Excel formats with flexible column naming
    """

    # Column name patterns (regex for flexible matching)
    TASK_PATTERNS = {
        'task_id': r'task[_\s]*id|id|task[_\s]*number',
        'name': r'task[_\s]*name|name|task|description|activity',
        'duration': r'duration|days|time',
        'start_date': r'start[_\s]*date|start',
        'end_date': r'end[_\s]*date|end|finish',
        'dependencies': r'depend|predecessor|previous',
        'priority': r'priority|importance',
        'cost': r'cost|budget|expense',
    }

    RESOURCE_PATTERNS = {
        'resource_id': r'resource[_\s]*id|id',
        'name': r'resource[_\s]*name|name|resource',
        'type': r'type|category|kind',
        'capacity': r'capacity|quantity|count',
        'availability_start': r'available[_\s]*from|start[_\s]*date|available[_\s]*start',
        'availability_end': r'available[_\s]*until|end[_\s]*date|available[_\s]*end',
        'hourly_cost': r'cost|rate|hourly[_\s]*cost|hourly[_\s]*rate',
        'skills': r'skills|capabilities|competencies',
    }

    CONSTRAINT_PATTERNS = {
        'constraint_type': r'type|constraint[_\s]*type',
        'entity_id': r'task[_\s]*id|entity[_\s]*id|id',
        'constraint': r'constraint|rule|condition',
        'value': r'value|limit|threshold',
    }

    def __init__(self):
        pass

    def _match_column(self, column_name: str, patterns: Dict[str, str]) -> Optional[str]:
        """
        Match column name against patterns (case-insensitive)
        Returns the matched field name or None
        """
        column_lower = column_name.lower().strip()
        for field, pattern in patterns.items():
            if re.search(pattern, column_lower, re.IGNORECASE):
                return field
        return None

    def _infer_schema(self, df: pd.DataFrame, patterns: Dict[str, str]) -> Dict[str, str]:
        """
        Infer schema by mapping dataframe columns to expected fields
        Returns mapping of field_name -> column_name
        """
        schema_mapping = {}
        for column in df.columns:
            matched_field = self._match_column(column, patterns)
            if matched_field:
                schema_mapping[matched_field] = column
        return schema_mapping

    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse planning file (CSV or Excel) and extract structured data
        
        Args:
            file_path: Path to uploaded file
            
        Returns:
            Dictionary with tasks, resources, constraints lists
            
        Raises:
            ValueError: If file format is unsupported or parsing fails
        """
        path = Path(file_path)
        file_ext = path.suffix.lower()

        try:
            # Load file based on extension
            if file_ext == '.csv':
                df = pd.read_csv(file_path)
            elif file_ext in ['.xlsx', '.xls']:
                # Try reading first sheet
                df = pd.read_excel(file_path, sheet_name=0)
            else:
                raise ValueError(f"Unsupported file format: {file_ext}. Please upload CSV or Excel files.")

            # Infer what type of data this is based on columns
            task_schema = self._infer_schema(df, self.TASK_PATTERNS)
            resource_schema = self._infer_schema(df, self.RESOURCE_PATTERNS)

            # Determine primary data type (tasks or resources)
            if 'task_id' in task_schema or 'name' in task_schema:
                return self._parse_tasks(df, task_schema)
            elif 'resource_id' in resource_schema:
                return self._parse_resources(df, resource_schema)
            else:
                # Try to parse as generic tasks
                return self._parse_generic_tasks(df)

        except Exception as e:
            raise ValueError(f"Failed to parse file: {str(e)}")

    def _parse_tasks(self, df: pd.DataFrame, schema: Dict[str, str]) -> Dict[str, Any]:
        """Parse tasks from dataframe using inferred schema"""
        tasks = []
        
        for idx, row in df.iterrows():
            task_data = {
                'task_id': str(row.get(schema.get('task_id', ''), f'T{idx:03d}')),
                'name': str(row.get(schema.get('name', ''), f'Task {idx}')),
                'duration_days': float(row.get(schema.get('duration', ''), 1.0)),
                'lineage': PlanLineageType.HUMAN_CREATED.value,
            }

            # Optional fields
            if 'start_date' in schema and pd.notna(row.get(schema['start_date'])):
                task_data['start_date'] = pd.to_datetime(row[schema['start_date']])
            if 'end_date' in schema and pd.notna(row.get(schema['end_date'])):
                task_data['end_date'] = pd.to_datetime(row[schema['end_date']])
            if 'dependencies' in schema and pd.notna(row.get(schema['dependencies'])):
                deps = str(row[schema['dependencies']]).split(',')
                task_data['dependencies'] = [d.strip() for d in deps if d.strip()]
            if 'priority' in schema and pd.notna(row.get(schema['priority'])):
                task_data['priority'] = str(row[schema['priority']])
            if 'cost' in schema and pd.notna(row.get(schema['cost'])):
                task_data['cost'] = float(row[schema['cost']])

            tasks.append(task_data)

        return {
            'tasks': tasks,
            'resources': [],
            'constraints': {},
        }

    def _parse_resources(self, df: pd.DataFrame, schema: Dict[str, str]) -> Dict[str, Any]:
        """Parse resources from dataframe using inferred schema"""
        resources = []
        
        for idx, row in df.iterrows():
            resource_data = {
                'resource_id': str(row.get(schema.get('resource_id', ''), f'R{idx:03d}')),
                'name': str(row.get(schema.get('name', ''), f'Resource {idx}')),
                'type': str(row.get(schema.get('type', ''), 'Equipment')),
            }

            # Optional fields
            if 'capacity' in schema and pd.notna(row.get(schema['capacity'])):
                resource_data['capacity'] = int(row[schema['capacity']])
            if 'hourly_cost' in schema and pd.notna(row.get(schema['hourly_cost'])):
                resource_data['hourly_cost'] = float(row[schema['hourly_cost']])
            if 'skills' in schema and pd.notna(row.get(schema['skills'])):
                skills = str(row[schema['skills']]).split(',')
                resource_data['skills'] = [s.strip() for s in skills if s.strip()]

            resources.append(resource_data)

        return {
            'tasks': [],
            'resources': resources,
            'constraints': {},
        }

    def _parse_generic_tasks(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Fallback parser for unstructured data - treat first column as task names"""
        tasks = []
        
        for idx, row in df.iterrows():
            # Use first non-null value as task name
            task_name = None
            for col in df.columns:
                if pd.notna(row[col]):
                    task_name = str(row[col])
                    break
            
            if task_name:
                tasks.append({
                    'task_id': f'T{idx:03d}',
                    'name': task_name,
                    'duration_days': 1.0,
                    'lineage': PlanLineageType.HUMAN_CREATED.value,
                })

        return {
            'tasks': tasks,
            'resources': [],
            'constraints': {},
        }


class PlanGenerator:
    """
    Orchestrates plan generation using AI services and agent framework
    Handles constraint validation, optimization, and fallback strategies
    """

    def __init__(self, ai_service=None, agent_orchestrator=None):
        self.ai_service = ai_service
        self.agent_orchestrator = agent_orchestrator

    async def generate_plan(
        self,
        plan_data: Dict[str, Any],
        plan_name: str,
        constraints: Optional[Dict[str, Any]] = None
    ) -> PlanSchema:
        """
        Generate optimized plan using AI reasoning models
        
        Args:
            plan_data: Parsed planning data (tasks, resources, constraints)
            plan_name: Name for the plan
            constraints: Optional additional constraints
            
        Returns:
            PlanSchema with optimized tasks and AI-generated recommendations
        """
        # TODO: Implement full AI orchestration in T025-T027
        # For now, return human plan with basic processing
        
        tasks = [TaskSchema(**task) for task in plan_data.get('tasks', [])]
        resources = [ResourceSchema(**res) for res in plan_data.get('resources', [])]
        
        # Calculate basic metrics
        total_duration = sum(task.duration_days for task in tasks)
        
        plan = PlanSchema(
            name=plan_name,
            description="Human-created plan (AI generation pending)",
            status=PlanStatus.COMPLETED.value,
            lineage=PlanLineageType.HUMAN_CREATED.value,
            total_duration_days=total_duration,
            tasks=tasks,
            resources=resources,
            assumptions=[],
            recommendations=[],
        )
        
        return plan

    async def validate_constraints(self, plan_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate plan against constraints
        
        Returns:
            Tuple of (is_feasible, list_of_violations)
        """
        violations = []
        
        # Basic validation
        tasks = plan_data.get('tasks', [])
        if len(tasks) > 50:
            violations.append("Plan exceeds maximum task limit (50)")
        
        if len(tasks) < 1:
            violations.append("Plan must contain at least one task")
        
        # TODO: Add dependency cycle detection, resource capacity checks
        
        is_feasible = len(violations) == 0
        return is_feasible, violations

    async def suggest_constraint_relaxation(
        self,
        plan_data: Dict[str, Any],
        violations: List[str]
    ) -> Dict[str, Any]:
        """
        Generate constraint relaxation suggestions for infeasible plans
        Implements FR-014 (optimal constraint relaxation)
        
        Returns:
            Dictionary of suggested constraint modifications
        """
        suggestions = {
            'relaxations': [],
            'rationale': [],
        }
        
        # TODO: Implement AI-driven constraint relaxation in T027
        for violation in violations:
            if "task limit" in violation:
                suggestions['relaxations'].append({
                    'constraint': 'max_tasks',
                    'current_value': 50,
                    'suggested_value': len(plan_data.get('tasks', [])),
                    'impact': 'Extended processing time'
                })
                suggestions['rationale'].append(
                    "Increasing task limit to accommodate full project scope"
                )
        
        return suggestions
