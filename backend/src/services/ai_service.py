"""
Azure OpenAI service wrapper for AI-powered plan generation
Uses Azure AI Foundry SDK for unified access to reasoning models
"""

import asyncio
from typing import Dict, Any, Optional, List
import json

try:
    from azure.ai.inference.aio import ChatCompletionsClient
    from azure.core.credentials import AzureKeyCredential
    AZURE_AI_AVAILABLE = True
except ImportError:
    AZURE_AI_AVAILABLE = False


class AzureOpenAIService:
    """
    Service for interacting with Azure OpenAI reasoning models
    Supports o1-preview, o1-mini, and GPT-4 Turbo models
    """

    def __init__(
        self,
        endpoint: str,
        api_key: str,
        model: str = "o1-mini",
        max_tokens: int = 4000,
        timeout: int = 300,  # 5 minutes for reasoning models
    ):
        if not AZURE_AI_AVAILABLE:
            raise ImportError(
                "Azure AI SDK not installed. Install with: pip install azure-ai-inference"
            )
        
        self.endpoint = endpoint
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens
        self.timeout = timeout
        
        # Initialize async client
        self.client = ChatCompletionsClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(api_key)
        )

    async def generate_plan(
        self,
        plan_data: Dict[str, Any],
        constraints: Optional[Dict[str, Any]] = None,
        optimization_goals: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate optimized plan using Azure OpenAI reasoning model
        
        Args:
            plan_data: Parsed planning data (tasks, resources, constraints)
            constraints: Additional constraints to apply
            optimization_goals: List of goals (e.g., ["minimize_duration", "maximize_capacity"])
            
        Returns:
            Dictionary with optimized plan and reasoning trace
        """
        prompt = self._build_planning_prompt(plan_data, constraints, optimization_goals)
        
        try:
            response = await asyncio.wait_for(
                self.client.complete(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=self.max_tokens,
                    temperature=1.0,  # o1 models ignore temperature
                ),
                timeout=self.timeout
            )
            
            result = {
                'plan': response.choices[0].message.content,
                'reasoning': response.choices[0].message.get("reasoning_content", ""),
                'model': self.model,
                'tokens_used': response.usage.total_tokens if hasattr(response, 'usage') else 0,
            }
            
            # Parse structured output if JSON response
            try:
                result['structured_plan'] = json.loads(result['plan'])
            except json.JSONDecodeError:
                result['structured_plan'] = None
            
            return result
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"Plan generation exceeded timeout of {self.timeout} seconds")
        except Exception as e:
            raise RuntimeError(f"Azure OpenAI request failed: {str(e)}")

    async def validate_plan(
        self,
        plan_data: Dict[str, Any],
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate plan against constraints using AI reasoning
        
        Returns:
            Dictionary with feasibility status and constraint violations
        """
        prompt = self._build_validation_prompt(plan_data, constraints)
        
        try:
            response = await asyncio.wait_for(
                self.client.complete(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=2000,
                ),
                timeout=60  # Shorter timeout for validation
            )
            
            validation_result = response.choices[0].message.content
            
            # Parse validation results
            try:
                return json.loads(validation_result)
            except json.JSONDecodeError:
                return {
                    'is_feasible': True,
                    'violations': [],
                    'raw_response': validation_result
                }
                
        except Exception as e:
            raise RuntimeError(f"Plan validation failed: {str(e)}")

    async def suggest_improvements(
        self,
        plan_data: Dict[str, Any],
        current_metrics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate improvement recommendations using AI reasoning
        
        Returns:
            List of recommendation dictionaries
        """
        prompt = self._build_improvement_prompt(plan_data, current_metrics)
        
        try:
            response = await asyncio.wait_for(
                self.client.complete(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=2000,
                ),
                timeout=90
            )
            
            recommendations_text = response.choices[0].message.content
            
            # Parse recommendations
            try:
                recommendations = json.loads(recommendations_text)
                if isinstance(recommendations, list):
                    return recommendations
                elif isinstance(recommendations, dict) and 'recommendations' in recommendations:
                    return recommendations['recommendations']
                else:
                    return [recommendations]
            except json.JSONDecodeError:
                return [{
                    'type': 'general',
                    'description': recommendations_text,
                    'rationale': 'AI-generated suggestion'
                }]
                
        except Exception as e:
            print(f"Warning: Recommendation generation failed: {str(e)}")
            return []

    def _build_planning_prompt(
        self,
        plan_data: Dict[str, Any],
        constraints: Optional[Dict[str, Any]],
        optimization_goals: Optional[List[str]]
    ) -> str:
        """Build structured prompt for plan generation"""
        
        tasks = plan_data.get('tasks', [])
        resources = plan_data.get('resources', [])
        
        prompt = f"""You are an expert logistics planner for shipyard and port operations. Generate an optimized plan based on the following data:

**Tasks** ({len(tasks)} total):
{json.dumps(tasks, indent=2)}

**Resources** ({len(resources)} total):
{json.dumps(resources, indent=2)}

**Constraints**:
{json.dumps(constraints or {}, indent=2)}

**Optimization Goals**:
{', '.join(optimization_goals or ['minimize_duration', 'maximize_resource_utilization'])}

Please provide an optimized plan in JSON format with:
1. Reordered/optimized task schedule (with start_date and end_date)
2. Resource allocations for each task
3. Key assumptions made during planning
4. Recommendations for plan improvements
5. Metrics: total_duration_days, capacity_utilization, total_cost

Output must be valid JSON following this schema:
{{
  "tasks": [...],
  "resources": [...],
  "assumptions": [{{ "type": "...", "description": "...", "value": "..." }}],
  "recommendations": [{{ "type": "...", "description": "...", "rationale": "...", "impact": {{}} }}],
  "metrics": {{ "total_duration_days": 0, "capacity_utilization": 0, "total_cost": 0 }}
}}
"""
        return prompt

    def _build_validation_prompt(
        self,
        plan_data: Dict[str, Any],
        constraints: Dict[str, Any]
    ) -> str:
        """Build prompt for constraint validation"""
        
        return f"""Validate the following plan against constraints:

**Plan**:
{json.dumps(plan_data, indent=2)}

**Constraints**:
{json.dumps(constraints, indent=2)}

Check for:
- Dependency cycles
- Resource overallocation
- Constraint violations
- Scheduling conflicts

Return JSON:
{{
  "is_feasible": true/false,
  "violations": ["list of constraint violations"],
  "severity": "low/medium/high"
}}
"""

    def _build_improvement_prompt(
        self,
        plan_data: Dict[str, Any],
        current_metrics: Dict[str, Any]
    ) -> str:
        """Build prompt for improvement recommendations"""
        
        return f"""Analyze this shipyard/port logistics plan and suggest improvements:

**Current Plan**:
{json.dumps(plan_data, indent=2)}

**Current Metrics**:
{json.dumps(current_metrics, indent=2)}

Suggest actionable improvements for:
- Schedule optimization
- Resource utilization
- Cost reduction
- Risk mitigation

Return JSON array:
[
  {{
    "type": "task_reschedule|resource_reallocation|constraint_relaxation|other",
    "description": "Specific improvement",
    "rationale": "Why this helps",
    "impact": {{ "duration_change": -5, "cost_change": -10000 }}
  }}
]
"""


class MockAIService:
    """
    Mock AI service for testing without Azure credentials
    Returns deterministic responses for development
    """

    async def generate_plan(
        self,
        plan_data: Dict[str, Any],
        constraints: Optional[Dict[str, Any]] = None,
        optimization_goals: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Mock plan generation with basic optimization"""
        
        # Simple mock: add start/end dates, assumptions, recommendations
        tasks = plan_data.get('tasks', [])
        
        # Calculate schedule
        current_date = None
        for task in tasks:
            if not current_date:
                current_date = "2026-03-01"
            task['start_date'] = current_date
            task['end_date'] = "2026-03-15"  # Simplified
        
        return {
            'plan': json.dumps(plan_data),
            'structured_plan': plan_data,
            'reasoning': 'Mock AI reasoning: Applied basic scheduling algorithm',
            'model': 'mock-o1-mini',
            'tokens_used': 1000,
        }

    async def validate_plan(self, plan_data: Dict[str, Any], constraints: Dict[str, Any]) -> Dict[str, Any]:
        """Mock validation"""
        return {
            'is_feasible': True,
            'violations': [],
            'severity': 'low'
        }

    async def suggest_improvements(self, plan_data: Dict[str, Any], current_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Mock improvements"""
        return [
            {
                'type': 'task_reschedule',
                'description': 'Consider parallelizing independent tasks',
                'rationale': 'Tasks T002 and T003 have no dependencies',
                'impact': {'duration_change': -3}
            }
        ]
