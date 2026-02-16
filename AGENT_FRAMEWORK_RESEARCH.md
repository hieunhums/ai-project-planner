# Microsoft Agent Framework (Python) for Planning Optimization with Azure AI Foundry

**Date**: February 16, 2026  
**Purpose**: Research & Architecture Guide for orchestrating planning optimization tasks using Microsoft Agent Framework + Azure AI Foundry reasoning models

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Agent Framework Fundamentals](#agent-framework-fundamentals)
3. [Planning Optimization Workflow](#planning-optimization-workflow)
4. [Tool Definition Patterns](#tool-definition-patterns)
5. [Agent State Management](#agent-state-management)
6. [Azure AI Foundry Integration](#azure-ai-foundry-integration)
7. [Error Handling & Recovery](#error-handling--recovery)
8. [Complete Planning Agent Example](#complete-planning-agent-example)
9. [FastAPI Integration](#fastapi-integration)
10. [Deployment & Production Patterns](#deployment--production-patterns)

---

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Routes (/upload, /generate-plan, /compare, etc.)  │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         PlanningOrchestrator (AsyncClient)            │ │
│  │  • Instantiates planning agent                        │ │
│  │  • Manages planning workflow lifecycle                │ │
│  │  • Tracks plan versions & artifacts                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   Microsoft Agent Framework Client (AzureAIClient)    │ │
│  │  • Creates agent instance with tools                  │ │
│  │  • Manages conversation threads (state)              │ │
│  │  • Streams responses from AI Foundry                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
└───────────────┬───────────────────────────────────┬──────────┘
                │                                   │
                ▼                                   ▼
        ┌──────────────────────┐         ┌─────────────────────┐
        │  Tool Functions      │         │  Azure AI Foundry   │
        │                      │         │  (gpt-5.2-reasoning)│
        │  • parse_spreadsheet │         │                     │
        │  • validate_constr.  │         │  • Reasoning model  │
        │  • generate_plan     │  ◄──────┤  • 200K tokens in   │
        │  • extract_reasoning │         │  • 100K tokens out  │
        │  • compare_plans     │         │  • Async support    │
        │  • suggest_improve.  │         └─────────────────────┘
        └──────────────────────┘
                │
                ▼
        ┌──────────────────────┐
        │  External Services   │
        │                      │
        │  • File storage      │
        │  • Database (plans)  │
        │  • Logging/tracing   │
        └──────────────────────┘
```

### Core Components

| Component | Role | Responsibility |
|-----------|------|---|
| **AzureAIClient** | Agent Manager | Creates/manages agent instance, handles threading & context |
| **ChatAgent** | Decision Engine | Receives user input, calls tools, streams reasoning & decisions |
| **Tools** | Action Executors | Pure functions (constraint validation, plan generation, comparison) |
| **Threads** | State Container | Persist conversation history & multi-turn reasoning context |
| **Foundry Model** | Reasoning Engine | gpt-5.2-reasoning—orchestrates multi-step planning logic |

---

## Agent Framework Fundamentals

### 1. Core Concepts

#### **Agent**
- Autonomous entity that accepts user input and produces output actions
- Powered by an LLM with access to defined tools
- Maintains thread (conversation history) for multi-turn context
- Executes synchronously or asynchronously

#### **Tools** (Function Calling)
- Python functions exposed to the agent for task execution
- Schemas auto-generated from function signatures + docstrings
- Agent decides whether/when to call each tool based on user request
- Return values feed back into agent's reasoning loop

#### **Thread**
- Conversation transcript persisting: messages, tool calls, responses
- Enables multi-step workflows (e.g., validate → optimize → explain)
- Default implementation: in-memory; can be extended to server/database

#### **Streaming**
- Async generator yielding agent response chunks in real-time
- Supports text, tool calls, and raw API events
- Optimized for FastAPI WebSocket integration

### 2. Microsoft Agent Framework Setup

```python
# Installation
pip install agent-framework azure-identity azure-ai-projects

# Core imports
from agent_framework.azure import AzureAIClient  # Recommended for Foundry
from agent_framework.azure import AzureOpenAIChatClient  # For direct Azure OpenAI
from azure.identity import DefaultAzureCredential

# Authentication
credential = DefaultAzureCredential()  # Uses Azure CLI, managed identity, or env vars
```

### 3. Comparison: AzureAIClient vs. AzureOpenAIChatClient

| Feature | AzureAIClient (Foundry) | AzureOpenAIChatClient (Direct) |
|---------|-------------------------|-------------------------------|
| **Target Endpoint** | Foundry project (project.ai.azure.com) | Azure OpenAI (openai.azure.com) |
| **Agent Management** | Full lifecycle (create, delete, manage) | Limited (chat-focused) |
| **Credential Type** | Async (`azure.identity.aio`) | Sync (`azure.identity`) |
| **Use Cases** | Multi-turn reasoning workflows, stateless agents | Simple chat, single-turn tasks |
| **Recommended** | ✅ Planning workflows (preferred) | Azure OpenAI direct users |

**→ For planning optimization: Use `AzureAIClient` with Foundry**

---

## Planning Optimization Workflow

### Workflow Architecture (Multi-Step Agent-Based)

```
User Input
    │
    ▼
┌─────────────────────────────┐
│ 1. Parse & Validate         │
│  • Read spreadsheet/file    │
│  • Extract tasks/resources  │
│  • Validate data integrity  │
└─────────────────────────────┘
    │ (tasks, resources, constraints)
    ▼
┌─────────────────────────────┐
│ 2. Constraint Validation    │
│  • Check feasibility        │
│  • Identify conflicts       │
│  • Return violations/fixes  │
└─────────────────────────────┘
    │ (feasibility_report)
    ▼
┌─────────────────────────────┐
│ 3. Reasoning & Planning     │
│  • Agent calls reasoning    │
│    model with full prompt   │
│  • Model generates plan     │
│  • Extract task sequences   │
└─────────────────────────────┘
    │ (initial_plan, reasoning_steps)
    ▼
┌─────────────────────────────┐
│ 4. Verify & Optimize        │
│  • Re-validate plan vs.     │
│    constraints              │
│  • Suggest improvements     │
│  • Explain decisions        │
└─────────────────────────────┘
    │ (final_plan, explanations, improvements)
    ▼
┌─────────────────────────────┐
│ 5. Compare & Export         │
│  • Side-by-side comparison  │
│  • Highlight trade-offs     │
│  • Return plan artifacts    │
└─────────────────────────────┘
    │
    ▼
Return to User
```

### Agent Thread Management Strategy

```python
# Thread = Persistent conversation state
# Each planning session = one thread

class PlanningSession:
    """Manages a single planning workflow with multi-turn reasoning."""
    
    def __init__(self):
        self.thread = None  # Created on first tool call
        self.artifacts = {}  # Store: parsed_data, constraints, plan_versions
        
    async def initialize_agent(self, agent):
        """Initialize fresh thread for this session."""
        self.thread = agent.get_new_thread()  # Returns empty thread
        
    async def run_workflow_step(self, agent, instruction: str):
        """
        Executes one workflow step.
        Thread maintains context across steps.
        """
        return await agent.run(instruction, thread=self.thread)
```

**Thread Benefits in Planning**:
- Step 1 (parse) stores data in artifact → Step 2 (validate) can reference it
- Multi-turn reasoning: agent can correct mistakes mid-workflow
- Audit trail: full conversation history = plan decision justification

---

## Tool Definition Patterns

### Pattern 1: Structured Input/Output Tool

```python
from typing import Annotated
from pydantic import BaseModel
import json

# Define structured data models
class Task(BaseModel):
    id: str
    name: str
    duration_days: int
    dependencies: list[str] = []
    assigned_resource: str | None = None

class PlanData(BaseModel):
    tasks: list[Task]
    resources: dict[str, int]  # resource_name: available_units
    constraints: dict[str, str]  # constraint_name: description

# Tool 1: Parse spreadsheet
def parse_spreadsheet(
    file_path: Annotated[str, "Absolute path to uploaded CSV/Excel file"],
    file_format: Annotated[str, "One of: 'csv', 'xlsx'"],
) -> str:
    """
    Parse planning spreadsheet and extract structured data.
    
    Returns:
        JSON string containing parsed tasks, resources, and constraints
    """
    import pandas as pd
    
    # Read file
    if file_format == "csv":
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)
    
    # Extract sections (assumes standard format)
    tasks = []
    resources = {}
    
    for idx, row in df.iterrows():
        if row.get('section') == 'TASKS':
            tasks.append(Task(
                id=row['task_id'],
                name=row['task_name'],
                duration_days=row['duration'],
                dependencies=row.get('depends_on', '').split(','),
            ))
        elif row.get('section') == 'RESOURCES':
            resources[row['resource_name']] = row['available_units']
    
    plan_data = PlanData(tasks=tasks, resources=resources)
    return json.dumps(plan_data.model_dump(), indent=2)
```

### Pattern 2: Constraint Validation Tool

```python
class ConstraintViolation(BaseModel):
    constraint_id: str
    severity: str  # "error" | "warning"
    message: str
    affected_items: list[str]
    suggested_fix: str | None = None

class ConstraintReport(BaseModel):
    is_feasible: bool
    violations: list[ConstraintViolation]
    summary: str

def validate_constraints(
    plan_data_json: Annotated[str, "JSON string from parse_spreadsheet tool"],
    constraint_definitions: Annotated[str, "JSON defining constraints: {'capacity_limits': {...}, 'deadlines': {...}}"],
) -> str:
    """
    Validate parsed plan against defined constraints.
    Identifies: resource overallocation, deadline misses, skill gaps.
    
    Returns:
        JSON ConstraintReport with violations and suggested fixes
    """
    plan_data = PlanData.model_validate_json(plan_data_json)
    constraints = json.loads(constraint_definitions)
    
    violations = []
    
    # Check resource capacity
    for resource_name, available in plan_data.resources.items():
        allocated = sum(1 for t in plan_data.tasks if t.assigned_resource == resource_name)
        if allocated > available:
            violations.append(ConstraintViolation(
                constraint_id=f"capacity_{resource_name}",
                severity="error",
                message=f"{resource_name} overallocated: {allocated} tasks > {available} capacity",
                affected_items=[t.id for t in plan_data.tasks if t.assigned_resource == resource_name],
                suggested_fix=f"Reassign {allocated - available} tasks to different resources or extend timeline"
            ))
    
    # Check dependencies
    task_ids = {t.id for t in plan_data.tasks}
    for task in plan_data.tasks:
        for dep in task.dependencies:
            if dep not in task_ids:
                violations.append(ConstraintViolation(
                    constraint_id=f"dependency_missing",
                    severity="error",
                    message=f"Task {task.id} depends on missing task {dep}",
                    affected_items=[task.id],
                    suggested_fix="Add missing task or remove invalid dependency"
                ))
    
    report = ConstraintReport(
        is_feasible=len([v for v in violations if v.severity == "error"]) == 0,
        violations=violations,
        summary=f"Found {len(violations)} violations. Plan is {'feasible' if len([v for v in violations if v.severity == 'error']) == 0 else 'INFEASIBLE'}."
    )
    
    return json.dumps(report.model_dump())
```

### Pattern 3: AI Reasoning Tool (Calling the Model Again)

```python
from openai import AsyncOpenAI

async def generate_plan(
    plan_data_json: Annotated[str, "Parsed plan data as JSON"],
    constraint_report_json: Annotated[str, "Constraint validation report as JSON"],
    optimization_goal: Annotated[str, "Primary goal: 'minimize_schedule', 'maximize_utilization', 'balance_resources'"],
) -> str:
    """
    Use Azure AI Foundry reasoning model to generate optimized plan.
    This tool demonstrates nested reasoning: agent calls model directly.
    
    Returns:
        JSON containing generated plan with explanations
    """
    client = AsyncOpenAI(
        base_url="https://{your-resource}.openai.azure.com/openai/v1/",
        api_key=os.getenv("AZURE_OPENAI_API_KEY")
    )
    
    plan_data = json.loads(plan_data_json)
    report = json.loads(constraint_report_json)
    
    prompt = f"""
    You are a planning optimization expert. Given the following data, generate an optimal plan.
    
    **Planning Data:**
    {json.dumps(plan_data, indent=2)}
    
    **Constraint Validation Report:**
    {json.dumps(report.model_dump(), indent=2)}
    
    **Optimization Goal:** {optimization_goal}
    
    **Your Task:**
    1. Acknowledge any constraint violations
    2. Propose a feasible schedule respecting constraints
    3. Explain task sequence and resource assignments
    4. Identify potential risks or bottlenecks
    5. Suggest optimization opportunities
    
    Return a JSON with keys: task_sequence, resource_assignments, reasoning, risks, opportunities
    """
    
    response = await client.chat.completions.create(
        model="gpt-5.2-reasoning",  # Reasoning model
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4000,
        temperature=1,  # Required for o1 reasoning models
    )
    
    generated_plan = response.choices[0].message.content
    return generated_plan
```

### Pattern 4: Comparison Tool

```python
class PlanComparison(BaseModel):
    differences: dict[str, dict]
    trade_offs: list[str]
    improvement_opportunities: list[str]
    recommendation: str

def compare_plans(
    original_plan_json: Annotated[str, "Original (human) plan as JSON"],
    ai_plan_json: Annotated[str, "AI-generated plan as JSON"],
) -> str:
    """
    Compare original vs. AI plan side-by-side.
    Highlights: schedule deltas, resource utilization, risk profiles.
    
    Returns:
        JSON with differences, trade-offs, and recommendations
    """
    original = json.loads(original_plan_json)
    ai_plan = json.loads(ai_plan_json)
    
    differences = {
        "schedule_change": {
            "original_duration": original.get("total_duration_days"),
            "ai_duration": ai_plan.get("total_duration_days"),
            "delta_percent": ((ai_plan.get("total_duration_days") - original.get("total_duration_days")) 
                             / original.get("total_duration_days") * 100) if original.get("total_duration_days") else 0
        },
        "resource_utilization": {
            "original": original.get("resource_utilization", {}),
            "ai": ai_plan.get("resource_utilization", {}),
        }
    }
    
    trade_offs = []
    if differences["schedule_change"]["delta_percent"] < 0:
        trade_offs.append(f"AI plan is {abs(differences['schedule_change']['delta_percent']):.1f}% faster, but may increase resource pressure")
    
    improvement_opportunities = [
        "Parallel task execution opportunities",
        "Bottleneck elimination strategies",
        "Resource rebalancing suggestions",
    ]
    
    comparison = PlanComparison(
        differences=differences,
        trade_offs=trade_offs,
        improvement_opportunities=improvement_opportunities,
        recommendation="Recommend AI plan for schedule optimization; human plan preferred for resource distribution flexibility"
    )
    
    return json.dumps(comparison.model_dump())
```

---

## Agent State Management

### 1. Thread-Based State Persistence

```python
class PlanningSessionState:
    """Manages agent thread and planning artifacts across workflow steps."""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.thread = None  # Assigned from agent.get_new_thread()
        self.artifacts = {
            "parsed_data": None,      # PlanData from step 1
            "constraint_report": None,  # ConstraintReport from step 2
            "initial_plan": None,     # Generated plan from step 3
            "final_plan": None,       # Verified plan from step 4
            "comparison": None,       # Plan comparison from step 5
        }
        self.reasoning_chain = []  # Audit trail
        
    def capture_reasoning_step(self, step_name: str, input_data: dict, output_data: dict):
        """Record each planning step for explainability."""
        self.reasoning_chain.append({
            "step": step_name,
            "input": input_data,
            "output": output_data,
            "timestamp": datetime.utcnow().isoformat(),
        })
    
    def get_relevant_context_for_step(self, step_name: str) -> dict:
        """Return artifacts needed for this step."""
        if step_name == "parse":
            return {}
        elif step_name == "validate":
            return {"plan_data": self.artifacts["parsed_data"]}
        elif step_name == "optimize":
            return {
                "plan_data": self.artifacts["parsed_data"],
                "constraint_report": self.artifacts["constraint_report"]
            }
        # ... more steps
        return self.artifacts
```

### 2. Multi-Turn Planning Workflow

```python
class PlanningOrchestrator:
    """Orchestrates multi-turn planning workflow using Agent Framework."""
    
    def __init__(self, agent, session_id: str):
        self.agent = agent
        self.state = PlanningSessionState(session_id)
    
    async def run_complete_workflow(self, 
                                   file_path: str,
                                   optimization_goal: str = "balance_resources") -> PlanningSessionState:
        """Execute full planning workflow: parse → validate → optimize → verify → compare."""
        
        # Initialize new conversation thread
        self.state.thread = self.agent.get_new_thread()
        
        # Step 1: Tell agent to parse data
        step1_instruction = f"""
        Please parse the planning data from {file_path}.
        Use the parse_spreadsheet tool to extract tasks, resources, and constraints.
        Confirm successful parsing and summarize what you found.
        """
        
        print("STEP 1: Parsing...")
        async for chunk in self.agent.run_stream(step1_instruction, thread=self.state.thread):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        
        # Step 2: Validate constraints
        step2_instruction = """
        Now validate the parsed data against our standard constraints.
        Use the validate_constraints tool to check feasibility.
        Report any violations and suggest fixes.
        """
        
        print("\nSTEP 2: Validating constraints...")
        async for chunk in self.agent.run_stream(step2_instruction, thread=self.state.thread):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        
        # Step 3: Generate optimized plan
        step3_instruction = f"""
        Based on the validation, generate an optimized plan with optimization_goal={optimization_goal}.
        Use the generate_plan tool to produce the plan.
        Explain your reasoning for key decisions.
        """
        
        print("\nSTEP 3: Generating optimized plan...")
        async for chunk in self.agent.run_stream(step3_instruction, thread=self.state.thread):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        
        # Step 4: Extract final explanations
        step4_instruction = """
        Provide a final summary:
        1. Key decisions in this plan
        2. Constraints satisfied
        3. Potential risks
        4. Recommended next steps
        """
        
        print("\nSTEP 4: Final explanations...")
        async for chunk in self.agent.run_stream(step4_instruction, thread=self.state.thread):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        
        return self.state
```

### 3. Artifact Storage & Retrieval

```python
import aiofiles
import json
from pathlib import Path

class ArtifactStore:
    """Persist planning artifacts to disk/database for audit & replay."""
    
    def __init__(self, storage_dir: str):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
    
    async def save_session_state(self, session_id: str, state: PlanningSessionState):
        """Persist planning session to JSON."""
        session_file = self.storage_dir / f"{session_id}_session.json"
        
        session_data = {
            "session_id": session_id,
            "artifacts": {
                "parsed_data": state.artifacts["parsed_data"],
                "constraint_report": state.artifacts["constraint_report"],
                "initial_plan": state.artifacts["initial_plan"],
                # ... other artifacts
            },
            "reasoning_chain": state.reasoning_chain,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        async with aiofiles.open(session_file, 'w') as f:
            await f.write(json.dumps(session_data, indent=2))
    
    async def load_session_state(self, session_id: str) -> dict:
        """Retrieve planning session from storage."""
        session_file = self.storage_dir / f"{session_id}_session.json"
        
        async with aiofiles.open(session_file, 'r') as f:
            session_data = json.loads(await f.read())
        
        return session_data
```

---

## Azure AI Foundry Integration

### Recommended Models for Planning Optimization

| Model | Best For | Key Features | Cost |
|-------|----------|------|------|
| **gpt-5.2-reasoning** ⭐ | Multi-step reasoning tasks | 200K in / 100K out tokens, reasoning optimized | Best value |
| **o3** | Complex constraint solving | Advanced reasoning, long context, verified correctness | Premium |
| **claude-opus-4.5** | Explainable decisions | Superior code/logic, excellent explanations | Premium |
| **gpt-5** | Fast planning | Good balance of speed & quality | Moderate |
| **gpt-5.1-codex** | Code-heavy workflows | Strong on algorithm synthesis | Moderate |

**→ Recommendation: Start with gpt-5.2-reasoning for planning (best reasoning-to-cost ratio)**

### Complete Integration Example

```python
import os
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from agent_framework.azure import AzureAIClient
from typing import AsyncGenerator

class PlanningAgentFactory:
    """Factory to create configured planning agent with Foundry integration."""
    
    @staticmethod
    async def create_planning_agent(
        foundry_project_endpoint: str,
        model_deployment_name: str = "gpt-5.2-reasoning",
    ) -> AzureAIClient:
        """
        Create agent connected to Azure AI Foundry reasoning model.
        
        Args:
            foundry_project_endpoint: e.g., https://my-resource.ai.azure.com/projects/my-project
            model_deployment_name: Model name in Foundry (e.g., "gpt-5.2-reasoning")
        
        Returns:
            Configured AzureAIClient with planning tools attached
        """
        
        # Initialize credentials
        credential = DefaultAzureCredential()
        
        # Create AzureAIClient
        client = AzureAIClient(
            project_endpoint=foundry_project_endpoint,
            model_deployment_name=model_deployment_name,
            credential=credential,
        )
        
        return client
    
    @staticmethod
    def create_planning_tools() -> list:
        """Return all planning-related tools."""
        return [
            parse_spreadsheet,
            validate_constraints,
            generate_plan,
            compare_plans,
        ]

class PlanningAgentClient:
    """Async wrapper for planning agent with streaming support."""
    
    def __init__(self, client: AzureAIClient, tools: list):
        self.client = client
        self.tools = tools
        self.agent = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.agent = await self.client.create_agent(
            name="planning-optimizer",
            instructions="""You are an expert planning optimization assistant.
Your role:
1. Parse planning spreadsheets and extract structured data
2. Validate plans against constraints and identify conflicts
3. Use reasoning to generate optimized plans that balance
   schedule, resource utilization, and risk
4. Explain your decisions transparently
5. Compare different plans and recommend improvements

Always:
- Call tools to analyze data, don't make assumptions
- Explain your reasoning step-by-step
- Flag risks and suggest mitigations
- Keep non-technical stakeholders informed""",
            tools=self.tools,
        )
        return self
    
    async def __aexit__(self, exc_type, exc, tb):
        """Async context manager exit."""
        if self.agent:
            await self.agent.close()
    
    async def run_planning_workflow(self, 
                                   file_path: str,
                                   optimization_goal: str = "balance_resources") -> AsyncGenerator[str, None]:
        """Stream plan generation in real-time."""
        
        thread = self.agent.get_new_thread()
        
        instructions = f"""
        Please generate an optimized plan for the file: {file_path}
        Optimization goal: {optimization_goal}
        
        Steps:
        1. Parse the spreadsheet using parse_spreadsheet tool
        2. Validate constraints using validate_constraints tool
        3. Generate an optimized plan using generate_plan tool
        4. Explain key decisions and trade-offs
        """
        
        async for chunk in self.agent.run_stream(instructions, thread=thread):
            if chunk.text:
                yield chunk.text

# Usage in FastAPI
async def foundry_integration_example(file_path: str):
    """Example: Integration with FastAPI endpoint."""
    
    endpoint = "https://my-foundry-resource.ai.azure.com/projects/my-project"
    
    factory = PlanningAgentFactory()
    client = await factory.create_planning_agent(endpoint)
    tools = factory.create_planning_tools()
    
    async with PlanningAgentClient(client, tools) as planning_agent:
        async for chunk in planning_agent.run_planning_workflow(file_path):
            print(chunk, end="", flush=True)
```

---

## Error Handling & Recovery

### 1. Tool Execution Error Handling

```python
import logging
from typing import Callable
from functools import wraps

logger = logging.getLogger(__name__)

class ToolExecutionError(Exception):
    """Base exception for tool failures."""
    pass

def resilient_tool(max_retries: int = 2, timeout: float = 30.0):
    """Decorator to add error handling to tools."""
    
    def decorator(func: Callable) -> Callable:
        async def async_wrapper(*args, **kwargs):
            retries = 0
            while retries <= max_retries:
                try:
                    # Set timeout for tool execution
                    import asyncio
                    result = await asyncio.wait_for(
                        func(*args, **kwargs),
                        timeout=timeout
                    )
                    return result
                except asyncio.TimeoutError:
                    logger.warning(f"Tool {func.__name__} timeout (attempt {retries+1}/{max_retries+1})")
                    retries += 1
                    if retries > max_retries:
                        raise ToolExecutionError(f"Tool {func.__name__} exceeded timeout after {max_retries+1} attempts")
                except Exception as e:
                    logger.error(f"Tool {func.__name__} error: {str(e)}")
                    retries += 1
                    if retries > max_retries:
                        raise ToolExecutionError(f"Tool {func.__name__} failed: {str(e)}")
                    await asyncio.sleep(2 ** retries)  # Exponential backoff
        
        def sync_wrapper(*args, **kwargs):
            retries = 0
            while retries <= max_retries:
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    logger.error(f"Tool {func.__name__} error: {str(e)}")
                    retries += 1
                    if retries > max_retries:
                        raise ToolExecutionError(f"Tool {func.__name__} failed: {str(e)}")
                    import time
                    time.sleep(2 ** retries)
        
        # Return async or sync wrapper based on function
        import inspect
        return async_wrapper if inspect.iscoroutinefunction(func) else sync_wrapper
    
    return decorator

@resilient_tool(max_retries=2, timeout=30)
async def parse_spreadsheet_resilient(
    file_path: Annotated[str, "File path"],
    file_format: Annotated[str, "Format"],
) -> str:
    """Parse with automatic retry on failure."""
    # Tool implementation...
    pass
```

### 2. Agent-Level Error Recovery

```python
class PlanningWorkflowError(Exception):
    """Planning workflow errors."""
    pass

async def run_planning_with_recovery(
    orchestrator: PlanningOrchestrator,
    file_path: str,
    max_workflow_retries: int = 3
) -> PlanningSessionState:
    """Execute planning workflow with error recovery strategy."""
    
    attempt = 0
    last_error = None
    
    while attempt < max_workflow_retries:
        try:
            logger.info(f"Planning workflow attempt {attempt+1}/{max_workflow_retries}")
            state = await orchestrator.run_complete_workflow(file_path)
            return state
        except ToolExecutionError as e:
            last_error = e
            logger.error(f"Tool error on attempt {attempt+1}: {str(e)}")
            attempt += 1
            
            if attempt < max_workflow_retries:
                # Recovery strategy: reset thread and retry
                orchestrator.state.thread = None
                await asyncio.sleep(5)  # Wait before retry
        except Exception as e:
            last_error = e
            logger.error(f"Unexpected error on attempt {attempt+1}: {str(e)}")
            attempt += 1
            raise PlanningWorkflowError(f"Workflow failed after {max_workflow_retries} attempts: {str(last_error)}")
    
    raise PlanningWorkflowError(f"Workflow exhausted retries: {str(last_error)}")
```

### 3. Constraint Violation Recovery

```python
async def handle_constraint_violations(
    report: ConstraintReport,
    agent,
    current_plan: dict,
) -> dict:
    """
    Auto-recovery for constraint violations.
    Asks agent to fix violations and regenerate plan.
    """
    
    if report.is_feasible:
        return current_plan
    
    logger.warning(f"Found {len(report.violations)} constraint violations. Requesting recovery...")
    
    violations_summary = "\n".join([
        f"- {v.constraint_id}: {v.message} → Suggested fix: {v.suggested_fix}"
        for v in report.violations
    ])
    
    recovery_instruction = f"""
    The current plan has constraint violations:
    {violations_summary}
    
    Please regenerate the plan applying these fixes.
    Ensure the new plan respects all constraints.
    """
    
    modified_plan_text = ""
    async for chunk in agent.run_stream(recovery_instruction):
        if chunk.text:
            modified_plan_text += chunk.text
    
    # Parse regenerated plan
    return json.loads(modified_plan_text)
```

### 4. Circuit Breaker Pattern

```python
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"          # Too many errors, fail fast
    HALF_OPEN = "half_open"  # Testing recovery

class PlanningAgentCircuitBreaker:
    """Prevent cascading failures to Foundry model."""
    
    def __init__(self, 
                 failure_threshold: int = 5,
                 recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    async def call(self, agent_func: Callable, *args, **kwargs):
        """Execute agent function with circuit breaker protection."""
        
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has elapsed
            if datetime.utcnow() - self.last_failure_time > timedelta(seconds=self.recovery_timeout):
                logger.info("Circuit breaker: transitioning to HALF_OPEN")
                self.state = CircuitState.HALF_OPEN
            else:
                raise PlanningWorkflowError("Circuit breaker OPEN: Service temporarily unavailable")
        
        try:
            result = await agent_func(*args, **kwargs)
            
            if self.state == CircuitState.HALF_OPEN:
                logger.info("Circuit breaker: transitioning back to CLOSED")
                self.state = CircuitState.CLOSED
                self.failure_count = 0
            
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            if self.failure_count >= self.failure_threshold:
                logger.error(f"Circuit breaker: failure threshold reached ({self.failure_count}). Opening circuit.")
                self.state = CircuitState.OPEN
            
            raise
```

---

## Complete Planning Agent Example

### Full Implementation

```python
"""
Complete planning agent for shipyard/port logistics.
Combines Agent Framework + Azure AI Foundry + FastAPI.
"""

import asyncio
import json
from typing import Annotated, AsyncGenerator
from datetime import datetime
from pydantic import BaseModel
from agent_framework.azure import AzureAIClient
from azure.identity import DefaultAzureCredential

# ============================================================================
# Data Models
# ============================================================================

class Task(BaseModel):
    id: str
    name: str
    duration_days: int
    dependencies: list[str] = []
    assigned_resource: str | None = None

class Resource(BaseModel):
    name: str
    available_units: int
    skill_requirements: list[str] = []

class PlanData(BaseModel):
    tasks: list[Task]
    resources: list[Resource]
    constraints: dict[str, str]

class GeneratedPlan(BaseModel):
    task_sequence: list[dict]  # [{"task_id": "T1", "start_day": 1, "end_day": 5}, ...]
    resource_allocation: dict    # {"resource_name": [task_ids]}
    critical_path: list[str]
    total_duration_days: int
    resource_utilization: dict[str, float]  # percentages
    risks: list[str]
    reasoning: str

# ============================================================================
# Tool Definitions
# ============================================================================

def parse_planning_data(
    file_content: Annotated[str, "CSV/JSON content of planning data"],
) -> str:
    """Parse planning data into structured format."""
    import csv
    import io
    
    try:
        lines = file_content.strip().split('\n')
        reader = csv.DictReader(io.StringIO(file_content))
        
        tasks = []
        resources = []
        
        for row in reader:
            if row.get('type') == 'TASK':
                tasks.append(Task(
                    id=row['id'],
                    name=row['name'],
                    duration_days=int(row.get('duration', 0)),
                    dependencies=row.get('depends_on', '').split(',') if row.get('depends_on') else []
                ))
            elif row.get('type') == 'RESOURCE':
                resources.append(Resource(
                    name=row['name'],
                    available_units=int(row.get('units', 1))
                ))
        
        plan = PlanData(
            tasks=tasks,
            resources=resources,
            constraints={"schedule": "strict", "resources": "flexible"}
        )
        
        return json.dumps(plan.model_dump())
    except Exception as e:
        return json.dumps({"error": str(e)})

async def generate_optimized_plan(
    plan_data_json: Annotated[str, "Parsed plan data as JSON"],
    optimization_goal: Annotated[str, "Goal: minimize_schedule, maximize_utilization, balance"],
) -> str:
    """
    Generate optimized plan using Foundry reasoning model.
    This demonstrates nested model calling from within an agent tool.
    """
    
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    client = AsyncOpenAI(
        base_url="https://your-resource.openai azure.com/openai/v1/",
        api_key=api_key
    )
    
    plan_data = json.loads(plan_data_json)
    
    prompt = f"""
You are a planning optimization expert. Analyze the provided planning data and generate an optimal plan.

**Planning Data:**
{json.dumps(plan_data, indent=2)}

**Optimization Goal:** {optimization_goal}

**Generate:**
1. Task sequence with start/end dates
2. Resource allocations
3. Critical path (bottleneck tasks)
4. Risk analysis
5. Explainability: why these assignments?

Return JSON matching: {{"task_sequence": [...], "resource_allocation": {{}}, "critical_path": [...], "total_duration_days": N, "risks": [...], "reasoning": "..."}}
    """
    
    response = await client.chat.completions.create(
        model="gpt-5.2-reasoning",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4000,
        temperature=1,  # Required for reasoning models
    )
    
    return response.choices[0].message.content

def compare_original_vs_ai(
    original_plan_json: Annotated[str, "Original human plan as JSON"],
    ai_plan_json: Annotated[str, "AI-generated plan as JSON"],
) -> str:
    """Compare two plans side-by-side."""
    original = json.loads(original_plan_json)
    ai = json.loads(ai_plan_json)
    
    comparison = {
        "schedule": {
            "original": original.get("total_duration_days"),
            "ai": ai.get("total_duration_days"),
            "improvement": f"{((original.get('total_duration_days', 1) - ai.get('total_duration_days', 0)) / max(original.get('total_duration_days', 1), 1) * 100):.1f}%"
        },
        "utilization": {
            "original": original.get("resource_utilization", {}),
            "ai": ai.get("resource_utilization", {}),
        },
        "ai_advantages": [
            "Faster schedule" if ai.get("total_duration_days", float('inf')) < original.get("total_duration_days", 0) else "",
            "Better resource balance" if max(ai.get("resource_utilization", {}).values() or [0]) < max(original.get("resource_utilization", {}).values() or [0]) else "",
        ],
        "recommendation": "Adopt AI plan for schedule; hybrid for resource flexibility"
    }
    
    return json.dumps(comparison, indent=2)

# ============================================================================
# Planning Agent Client
# ============================================================================

class PlanningAgent:
    """Orchestrates multi-step planning workflow."""
    
    def __init__(self, foundry_endpoint: str, model_name: str = "gpt-5.2-reasoning"):
        self.foundry_endpoint = foundry_endpoint
        self.model_name = model_name
        self.client = None
        self.agent = None
    
    async def initialize(self):
        """Initialize Agent Framework client."""
        credential = DefaultAzureCredential()
        self.client = AzureAIClient(
            project_endpoint=self.foundry_endpoint,
            model_deployment_name=self.model_name,
            credential=credential,
        )
        
        self.agent = await self.client.create_agent(
            name="planning-agent",
            instructions="""
You are an expert planning optimization agent for shipyard and port logistics.
Your role:
1. Parse planning data (tasks, resources, constraints)
2. Generate optimized plans considering schedule, resources, and risks
3. Compare original vs. AI plans transparently
4. Explain your reasoning to stakeholders

Always:
- Use tools to process data
- Flag risks and constraints
- Explain trade-offs clearly
- Recommend next steps
            """,
            tools=[
                parse_planning_data,
                generate_optimized_plan,
                compare_original_vs_ai,
            ]
        )
    
    async def run_planning_workflow(self,
                                   file_content: str,
                                   optimization_goal: str = "balance") -> AsyncGenerator[str, None]:
        """Stream planning workflow in real-time."""
        
        if not self.agent:
            await self.initialize()
        
        thread = self.agent.get_new_thread()
        
        # Step 1: Parse
        parse_instruction = f"""
Parse the following planning data:
{file_content}

Use parse_planning_data tool. Summarize what you found: tasks, resources, constraints.
        """
        
        async for chunk in self.agent.run_stream(parse_instruction, thread=thread):
            if chunk.text:
                yield chunk.text
        
        # Step 2: Optimize
        optimize_instruction = f"""
Generate an optimized plan with goal: {optimization_goal}
Use generate_optimized_plan tool.
Explain key decisions and potential risks.
        """
        
        async for chunk in self.agent.run_stream(optimize_instruction, thread=thread):
            if chunk.text:
                yield chunk.text
    
    async def close(self):
        """Cleanup."""
        if self.agent:
            await self.agent.close()
        if self.client:
            await self.client.close()
```

---

## FastAPI Integration

### Streaming Endpoint

```python
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
import os

app = FastAPI()

@app.post("/planning/generate-plan")
async def generate_plan_endpoint(
    file: UploadFile = File(...),
    optimization_goal: str = "balance"
) -> StreamingResponse:
    """Generate optimized plan with real-time streaming."""
    
    # Read file
    content = await file.read()
    file_text = content.decode('utf-8')
    
    # Initialize planning agent
    foundry_endpoint = os.getenv("FOUNDRY_PROJECT_ENDPOINT")
    planner = PlanningAgent(foundry_endpoint)
    await planner.initialize()
    
    async def stream_generator():
        """Stream planning steps in real-time."""
        try:
            yield b"data: {\"status\": \"Starting planning workflow...\"}\n\n"
            
            async for chunk in planner.run_planning_workflow(file_text, optimization_goal):
                # Send each chunk as SSE
                event_data = json.dumps({
                    "content": chunk,
                    "timestamp": datetime.utcnow().isoformat()
                }).encode('utf-8')
                yield b"data: " + event_data + b"\n\n"
            
            yield b"data: {\"status\": \"Planning complete\"}\n\n"
        finally:
            await planner.close()
    
    return StreamingResponse(stream_generator(), media_type="text/event-stream")

@app.post("/planning/compare")
async def compare_plans_endpoint(
    original_plan: dict,
    ai_plan: dict
) -> dict:
    """Compare plans side-by-side."""
    
    planner = PlanningAgent(os.getenv("FOUNDRY_PROJECT_ENDPOINT"))
    await planner.initialize()
    
    thread = planner.agent.get_new_thread()
    comparison_prompt = f"""
Compare these two plans:
Original: {json.dumps(original_plan)}
AI: {json.dumps(ai_plan)}

Use compare_original_vs_ai tool. Provide detailed analysis.
    """
    
    response_text = ""
    async for chunk in planner.agent.run_stream(comparison_prompt, thread=thread):
        if chunk.text:
            response_text += chunk.text
    
    await planner.close()
    return json.loads(response_text)
```

---

## Deployment & Production Patterns

### Environment Configuration

```bash
# .env
FOUNDRY_PROJECT_ENDPOINT=https://my-resource.ai.azure.com/projects/default
FOUNDRY_MODEL_DEPLOYMENT=gpt-5.2-reasoning
AZURE_OPENAI_API_KEY=xxxxx  # For nested model calls
PLANNING_SESSIONS_DIR=/var/planning/sessions
LOG_LEVEL=INFO
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run with logging
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
```

### Kubernetes Deployment (Sample)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: planning-agent-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: planning-agent
  template:
    metadata:
      labels:
        app: planning-agent
    spec:
      containers:
      - name: api
        image: myregistry/planning-agent:latest
        ports:
        - containerPort: 8000
        env:
        - name: FOUNDRY_PROJECT_ENDPOINT
          valueFrom:
            secretKeyRef:
              name: foundry-secrets
              key: project-endpoint
        - name: AZURE_OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: foundry-secrets
              key: api-key
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
```

---

## Summary: Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                           User/Frontend                             │
│                  (Upload Plan, View Results)                       │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │    FastAPI Backend         │
        │  POST /planning/generate-plan
        │  POST /planning/compare
        │  GET  /planning/status
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  PlanningOrchestrator      │
        │  • Multi-turn workflow     │
        │  • Thread management       │
        │  • Artifact storage        │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────┐
        │  Microsoft Agent Framework (v2)        │
        │  • AzureAIClient                       │
        │  • ChatAgent with tools                │
        │  • Thread (conversation state)         │
        └────────┬──────────────┬────────────────┘
                 │              │
                 │              ├──→ Tool: parse_spreadsheet
                 │              ├──→ Tool: validate_constraints
    ┌────────────▼──────────┐   ├──→ Tool: generate_plan
    │ Azure AI Foundry      │   ├──→ Tool: compare_plans
    │ (gpt-5.2-reasoning)   │   └──→ Tool: extract_reasoning
    │                       │
    │ • 200K input tokens   │
    │ • 100K output tokens  │
    │ • Streaming support   │
    │ • Async native        │
    └───────────────────────┘

Key Integration Points:
1. Credential: DefaultAzureCredential (Entra ID)
2. Communication: Async/await with streaming
3. Error Handling: Circuit Breaker + Retry logic
4. State: Thread-based with artifact persistence
5. Observability: Structured logging + tracing
```

---

## Key Takeaways

### For Planning Optimization with Agent Framework:

1. **Architecture**: Use `AzureAIClient` (Foundry) for full agent lifecycle + `gpt-5.2-reasoning` model
2. **Workflows**: Multi-step process (parse → validate → optimize → verify) mapped to agent instructions  
3. **Tools**: Define pure, typed functions; let agent decide when to call them
4. **State**: Leverage threads for context persistence across workflow steps
5. **Integration**: FastAPI + async/await for streaming responses  
6. **Reliability**: Circuit breakers + exponential backoff for production robustness
7. **Explainability**: Tools return structured data (JSON) for audit trails & transparency

### Next Steps:
- Deploy first planning agent with 2-3 core tools
- Test workflow with sample shipyard data
- Implement artifact storage for audit compliance
- Add WebSocket streaming for real-time UI updates

---

**Document Generated**: 2026-02-16  
**Azure AI Foundry Models**: gpt-5.2-reasoning recommended  
**Framework Version**: agent-framework (v2), Azure AI Projects SDK 1.x
