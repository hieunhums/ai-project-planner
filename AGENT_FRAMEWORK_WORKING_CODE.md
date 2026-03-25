# Planning Agent: Complete Working Implementation

This file contains a production-ready example of a planning optimization agent using Microsoft Agent Framework + FastAPI + Azure AI Foundry.

## Structure

```
planning-agent/
├── main.py                 # FastAPI app & endpoints
├── agents.py              # Planning agent definition
├── tools.py               # Tool functions for agent
├── models.py              # Pydantic data models
├── config.py              # Configuration & environment
├── requirements.txt       # Dependencies
└── README.md             # Setup & testing guide
```

---

## config.py

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Azure Foundry
    FOUNDRY_PROJECT_ENDPOINT = os.getenv(
        "FOUNDRY_PROJECT_ENDPOINT",
        "https://my-resource.ai.azure.com/projects/default"
    )
    FOUNDRY_MODEL_DEPLOYMENT = os.getenv(
        "FOUNDRY_MODEL_DEPLOYMENT",
        "gpt-5.2-reasoning"
    )
    
    # FastAPI
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    API_TITLE = "Planning Optimization Agent"
    API_VERSION = "0.1.0"
    
    # Storage
    SESSIONS_DIR = os.getenv("SESSIONS_DIR", "/tmp/planning_sessions")
    
    # Timeouts
    AGENT_TIMEOUT_SEC = int(os.getenv("AGENT_TIMEOUT_SEC", "60"))
    PLAN_GENERATION_TIMEOUT_SEC = int(os.getenv("PLAN_GEN_TIMEOUT_SEC", "120"))

config = Config()
```

---

## models.py

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class TaskModel(BaseModel):
    id: str = Field(..., description="Unique task ID")
    name: str = Field(..., description="Task name")
    duration_days: int = Field(..., ge=1, description="Duration in days")
    dependencies: list[str] = Field(default_factory=list, description="List of task IDs this depends on")
    assigned_resource: Optional[str] = Field(None, description="Assigned resource name")
    priority: int = Field(default=1, ge=1, le=5, description="Priority (1=lowest, 5=highest)")

class ResourceModel(BaseModel):
    name: str = Field(..., description="Resource name")
    available_units: int = Field(..., ge=1, description="Number of available units")
    skills: list[str] = Field(default_factory=list, description="Skills/expertise")

class ConstraintModel(BaseModel):
    id: str
    name: str
    description: str
    constraint_type: str  # "capacity", "schedule", "dependency", "skill"

class PlanDataModel(BaseModel):
    tasks: list[TaskModel]
    resources: list[ResourceModel]
    constraints: list[ConstraintModel] = Field(default_factory=list)
    optimization_goal: str = Field(default="balance", description="minimize_schedule|maximize_utilization|balance")

class PlanGenerationRequest(BaseModel):
    file_content: str = Field(..., description="CSV/JSON content with task/resource data")
    original_plan: Optional[dict] = Field(None, description="Optional: original human plan for comparison")
    optimization_goal: str = Field(default="balance", description="Optimization goal")

class PlanGenerationResponse(BaseModel):
    session_id: str
    status: str  # "in_progress", "completed", "failed"
    plan_content: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ComparisonRequest(BaseModel):
    original_plan_json: str
    ai_plan_json: str

class ComparisonResponse(BaseModel):
    differences: dict
    trade_offs: list[str]
    advantages: list[str]
    recommendation: str
```

---

## tools.py

```python
import json
import logging
from typing import Annotated
import asyncio

logger = logging.getLogger(__name__)

# Tool 1: Parse spreadsheet data
def parse_planning_spreadsheet(
    file_content: Annotated[str, "CSV or JSON content with planning data"],
    data_format: Annotated[str, "Format: csv or json"] = "csv",
) -> str:
    """
    Parse planning spreadsheet into structured format.
    
    Expected CSV format:
    section,id,name,duration,depends_on,resource_name,available_units
    TASK,T1,Foundation,10,
    TASK,T2,Walls,15,T1
    RESOURCE,,,,,Crew1,5
    
    Returns JSON string with parsed data.
    """
    import csv
    import io
    
    try:
        tasks = []
        resources = {}
        
        if data_format == "csv":
            reader = csv.DictReader(io.StringIO(file_content))
            for row in reader:
                if row['section'] == 'TASK':
                    tasks.append({
                        'id': row['id'],
                        'name': row['name'],
                        'duration_days': int(row['duration']),
                        'dependencies': row.get('depends_on', '').split(',') if row.get('depends_on') else [],
                    })
                elif row['section'] == 'RESOURCE':
                    resources[row['resource_name']] = int(row.get('available_units', 1))
        
        elif data_format == "json":
            data = json.loads(file_content)
            tasks = data.get('tasks', [])
            resources = {r['name']: r['available_units'] for r in data.get('resources', [])}
        
        result = {
            'tasks_count': len(tasks),
            'resources_count': len(resources),
            'tasks': tasks,
            'resources': resources,
            'status': 'success'
        }
        
        logger.info(f"Parsed {len(tasks)} tasks, {len(resources)} resources")
        return json.dumps(result, indent=2)
    
    except Exception as e:
        logger.error(f"Parse error: {str(e)}")
        return json.dumps({'status': 'error', 'message': str(e)})

# Tool 2: Validate constraints
def validate_planning_constraints(
    parsed_data_json: Annotated[str, "JSON from parse_planning_spreadsheet"],
) -> str:
    """
    Validate plan against constraints.
    Checks: dependencies valid, resources available, etc.
    
    Returns JSON with violations and feasibility.
    """
    try:
        data = json.loads(parsed_data_json)
        tasks = data.get('tasks', [])
        resources = data.get('resources', {})
        
        violations = []
        
        # Check all task IDs exist for dependencies
        task_ids = {t['id'] for t in tasks}
        for task in tasks:
            for dep_id in task.get('dependencies', []):
                if dep_id not in task_ids:
                    violations.append({
                        'type': 'invalid_dependency',
                        'task': task['id'],
                        'message': f"Task {task['id']} depends on non-existent task {dep_id}"
                    })
        
        # Check resource overcapacity
        resource_load = {r: 0 for r in resources}
        for task in tasks:
            if task.get('assigned_resource'):
                resource_load[task['assigned_resource']] += 1
        
        for resource, load in resource_load.items():
            if load > resources.get(resource, 0):
                violations.append({
                    'type': 'resource_overload',
                    'resource': resource,
                    'message': f"Resource {resource} assigned {load} tasks but only has {resources.get(resource, 0)} units"
                })
        
        is_feasible = len(violations) == 0
        
        result = {
            'is_feasible': is_feasible,
            'violations_count': len(violations),
            'violations': violations,
            'summary': f"{'Plan is feasible' if is_feasible else 'Plan has constraints violations!'}. Found {len(violations)} issues."
        }
        
        logger.info(f"Constraint validation: feasible={is_feasible}, violations={len(violations)}")
        return json.dumps(result, indent=2)
    
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        return json.dumps({'status': 'error', 'message': str(e)})

# Tool 3: Extract reasoning steps
def extract_ai_reasoning(
    model_response: Annotated[str, "Full response from reasoning model"],
) -> str:
    """
    Extract structured reasoning steps from model response.
    Used for explainability.
    
    Returns JSON with decision reasoning and justifications.
    """
    try:
        # Simple extraction: look for reasoning markers
        reasoning_steps = []
        
        # In production, use more sophisticated parsing/NLP
        lines = model_response.split('\n')
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in ['because', 'reason', 'thus', 'therefore', 'decision']):
                reasoning_steps.append({
                    'step': i,
                    'text': line.strip()
                })
        
        result = {
            'reasoning_steps_count': len(reasoning_steps),
            'reasoning_steps': reasoning_steps[:10],  # Top 10
            'full_response': model_response[:1000]  # Preview
        }
        
        return json.dumps(result, indent=2)
    
    except Exception as e:
        return json.dumps({'status': 'error', 'message': str(e)})

# Tool 4: Compare plans
def compare_plans_tool(
    original_plan_json: Annotated[str, "Original plan as JSON"],
    ai_plan_json: Annotated[str, "AI-generated plan as JSON"],
) -> str:
    """
    Compare two plans side-by-side.
    Highlights: schedule delta, resource utilization, risks.
    """
    try:
        original = json.loads(original_plan_json) if original_plan_json else {}
        ai_plan = json.loads(ai_plan_json)
        
        original_duration = original.get('total_duration_days', 0)
        ai_duration = ai_plan.get('total_duration_days', 0)
        
        schedule_improvement = 0
        if original_duration > 0:
            schedule_improvement = ((original_duration - ai_duration) / original_duration) * 100
        
        result = {
            'schedule_delta_percent': round(schedule_improvement, 1),
            'original_duration': original_duration,
            'ai_duration': ai_duration,
            'resource_utilization_delta': {},
            'recommendation': 'AI plan recommended' if schedule_improvement > 0 else 'Original plan has advantages',
            'trade_offs': [
                f"AI plan {'faster' if schedule_improvement > 0 else 'slower'} by {abs(schedule_improvement):.1f}%",
                "Resource utilization patterns differ - review for constraints"
            ]
        }
        
        return json.dumps(result, indent=2)
    
    except Exception as e:
        return json.dumps({'status': 'error', 'message': str(e)})

# Return all tools for agent
def get_planning_tools():
    return [
        parse_planning_spreadsheet,
        validate_planning_constraints,
        extract_ai_reasoning,
        compare_plans_tool,
    ]
```

---

## agents.py

```python
import logging
import asyncio
from typing import AsyncGenerator
from agent_framework.azure import AzureAIClient
from azure.identity import DefaultAzureCredential

from config import config
from tools import get_planning_tools

logger = logging.getLogger(__name__)

class PlanningAgent:
    """Planning optimization agent powered by Azure AI Foundry."""
    
    def __init__(self):
        self.client = None
        self.agent = None
        self.credential = DefaultAzureCredential()
    
    async def initialize(self):
        """Initialize AzureAIClient and agent."""
        if self.agent:
            return  # Already initialized
        
        logger.info(f"Initializing planning agent: {config.FOUNDRY_PROJECT_ENDPOINT}")
        
        self.client = AzureAIClient(
            project_endpoint=config.FOUNDRY_PROJECT_ENDPOINT,
            model_deployment_name=config.FOUNDRY_MODEL_DEPLOYMENT,
            credential=self.credential,
        )
        
        self.agent = await self.client.create_agent(
            name="planning-optimizer",
            instructions="""You are an expert planning optimization assistant for shipyard and port logistics.

Your responsibilities:
1. Parse planning data (tasks, resources, constraints) using provided tools
2. Validate plans against physical and logical constraints
3. Generate feasible, optimized plans that balance:
   - Schedule efficiency (minimize duration)
   - Resource utilization (maximize efficiency)
   - Risk management (identify bottlenecks)
4. Compare plans transparently, highlighting trade-offs
5. Explain your reasoning to non-technical stakeholders

Key principles:
- Always use tools to process data; don't make assumptions
- Be explicit about constraints and trade-offs
- Provide reasoning for all major decisions
- Flag risks and suggest mitigations
- Keep explanations clear and actionable

For each request:
1. Parse the input using parse_planning_spreadsheet
2. Validate constraints using validate_planning_constraints
3. Identify issues and suggest optimization strategies
4. Compare with original plan if provided
5. Summarize key findings and recommendations""",
            tools=get_planning_tools(),
        )
        
        logger.info("Planning agent initialized successfully")
    
    async def run_planning_workflow(self,
                                   file_content: str,
                                   optimization_goal: str = "balance") -> AsyncGenerator[str, None]:
        """
        Execute planning workflow with streaming output.
        
        Workflow:
        1. Parse planning data
        2. Validate constraints
        3. Generate optimized plan
        4. Explain reasoning
        """
        
        await self.initialize()
        
        # Create fresh thread for this workflow
        thread = self.agent.get_new_thread()
        
        # Step 1: Parse & analyze
        parse_instruction = f"""
Please analyze the following planning data and prepare for optimization:

[Planning Data]
{file_content[:2000]}  # Limit size for prompt

Steps:
1. Use parse_planning_spreadsheet tool to extract and parse all data
2. Summarize what you found: how many tasks, resources, constraints
3. Identify any missing information or data quality issues
"""
        
        logger.info("Starting planning workflow: PARSE step")
        async for chunk in self.agent.run_stream(parse_instruction, thread=thread):
            if chunk.text:
                yield chunk.text
        
        # Step 2: Validate
        validate_instruction = """
Now validate the parsed plan:
1. Use validate_planning_constraints to check feasibility
2. Report any constraint violations
3. Suggest specific fixes for violations
"""
        
        logger.info("Continuing workflow: VALIDATE step")
        yield "\n\n=== VALIDATION PHASE ===\n"
        async for chunk in self.agent.run_stream(validate_instruction, thread=thread):
            if chunk.text:
                yield chunk.text
        
        # Step 3: Optimize
        optimize_instruction = f"""
Generate an optimized plan with goal: {optimization_goal}

Instructions:
1. Consider the constraints and violations identified
2. Propose task sequencing that optimizes for: {optimization_goal}
3. Allocate resources efficiently
4. Identify critical path (bottleneck tasks)
5. Explain your key decisions and trade-offs
"""
        
        logger.info("Continuing workflow: OPTIMIZE step")
        yield "\n\n=== OPTIMIZATION PHASE ===\n"
        async for chunk in self.agent.run_stream(optimize_instruction, thread=thread):
            if chunk.text:
                yield chunk.text
        
        # Step 4: Summary & recommendations
        summary_instruction = """
Provide a final summary:
1. Summary of the optimized plan
2. Key improvements vs. original
3. Remaining risks or constraints
4. Recommended next steps
"""
        
        logger.info("Finishing workflow: SUMMARY step")
        yield "\n\n=== FINAL SUMMARY ===\n"
        async for chunk in self.agent.run_stream(summary_instruction, thread=thread):
            if chunk.text:
                yield chunk.text
    
    async def compare_plans(self,
                           original_plan_json: str,
                           ai_plan_json: str) -> str:
        """Compare original vs. AI plan."""
        
        await self.initialize()
        thread = self.agent.get_new_thread()
        
        comparison_instruction = f"""
Compare these two plans:

[Original Plan]
{original_plan_json[:1000]}

[AI-Generated Plan]
{ai_plan_json[:1000]}

Use compare_plans_tool to analyze differences.
Provide:
1. Schedule comparison
2. Resource utilization differences
3. Risk profile comparison
4. Recommendation with justifications
"""
        
        result_text = ""
        async for chunk in self.agent.run_stream(comparison_instruction, thread=thread):
            if chunk.text:
                result_text += chunk.text
        
        return result_text
    
    async def close(self):
        """Cleanup resources."""
        if self.agent:
            await self.agent.close()
            self.agent = None
        if self.client:
            await self.client.close()
            self.client = None
```

---

## main.py

```python
import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import asyncio

from agents import PlanningAgent
from models import (
    PlanGenerationRequest, PlanGenerationResponse,
    ComparisonRequest, ComparisonResponse
)
from config import config

# Setup logging
logging.basicConfig(level=config.LOG_LEVEL)
logger = logging.getLogger(__name__)

# Global planning agent instance (singleton)
planning_agent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    global planning_agent
    
    # Startup
    logger.info("Initializing FastAPI app and planning agent...")
    planning_agent = PlanningAgent()
    await planning_agent.initialize()
    
    yield
    
    # Shutdown
    logger.info("Cleaning up...")
    await planning_agent.close()

# Create FastAPI app
app = FastAPI(
    title=config.API_TITLE,
    version=config.API_VERSION,
    lifespan=lifespan,
)

# ============================================================================
# Endpoints
# ============================================================================

@app.post("/planning/generate-plan")
async def generate_plan(request: PlanGenerationRequest) -> StreamingResponse:
    """
    Generate optimized plan with real-time streaming output.
    
    streaming response format: Server-Sent Events (SSE)
    """
    
    async def stream_generator():
        session_id = str(uuid.uuid4())
        
        try:
            yield f"data: {{'session_id': '{session_id}', 'status': 'starting'}}\n\n"
            
            async for chunk in planning_agent.run_planning_workflow(
                request.file_content,
                request.optimization_goal
            ):
                # SSE format: data: <content>\n\n
                yield b"data: " + f'{{\"content\": {repr(chunk)}}}'.encode() + b"\n\n"
            
            yield b"data: {'status': 'completed'}\n\n"
            logger.info(f"Planning workflow completed: {session_id}")
        
        except Exception as e:
            logger.error(f"Planning workflow error: {str(e)}")
            yield b"data: {'status': 'error', 'message': '" + str(e).encode() + b"'}\n\n"
    
    return StreamingResponse(stream_generator(), media_type="text/event-stream")

@app.post("/planning/compare")
async def compare_plans(request: ComparisonRequest) -> dict:
    """Compare original vs. AI-generated plans."""
    
    try:
        comparison_result = await planning_agent.compare_plans(
            request.original_plan_json,
            request.ai_plan_json
        )
        
        return {
            'status': 'success',
            'comparison': comparison_result
        }
    
    except Exception as e:
        logger.error(f"Comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        'status': 'healthy',
        'agent_initialized': planning_agent is not None
    }

@app.get("/")
async def root():
    """API info."""
    return {
        'name': config.API_TITLE,
        'version': config.API_VERSION,
        'endpoints': [
            'POST /planning/generate-plan',
            'POST /planning/compare',
            'GET /health'
        ]
    }

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting FastAPI server...")
    logger.info(f"Foundry endpoint: {config.FOUNDRY_PROJECT_ENDPOINT}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level=config.LOG_LEVEL.lower(),
    )
```

---

## requirements.txt

```
agent-framework>=0.1.0
azure-identity>=1.14.0
azure-ai-projects>=0.1.0
fastapi>=0.104.0
uvicorn>=0.24.0
pydantic>=2.0.0
python-multipart>=0.0.6
python-dotenv>=1.0.0
aiofiles>=23.0.0
pandas>=2.0.0
openpyxl>=3.1.0
openai>=1.3.0
```

---

## .env (Template)

```bash
# Azure Foundry
FOUNDRY_PROJECT_ENDPOINT=https://YOUR-RESOURCE.ai.azure.com/projects/default
FOUNDRY_MODEL_DEPLOYMENT=gpt-5.2-reasoning

# FastAPI
LOG_LEVEL=INFO

# Storage
SESSIONS_DIR=/tmp/planning_sessions

# Timeouts (seconds)
AGENT_TIMEOUT_SEC=60
PLAN_GEN_TIMEOUT_SEC=120
```

---

## Usage

### Local Development

```bash
# 1. Setup
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 2. Configure
cp .env.example .env
# Edit .env with your Foundry endpoints

# 3. Authenticate
az login

# 4. Run
python main.py
# Server runs at http://localhost:8000

# 5. Test
curl -X POST http://localhost:8000/planning/generate-plan \
  -H "Content-Type: application/json" \
  -d '{"file_content":"section,id,name,duration,depends_on\nTASK,T1,Foundation,10,\nTASK,T2,Walls,15,T1", "optimization_goal":"balance"}'
```

### Docker

```bash
docker build -t planning-agent:latest .
docker run -e FOUNDRY_PROJECT_ENDPOINT=... --port 8000:8000 planning-agent
```

---

**Ready to use!** Copy and adapt these files for your planning optimization system.

Generated: 2026-02-16
