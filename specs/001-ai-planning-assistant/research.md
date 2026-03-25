# Research: AI-Augmented Planning Assistant

**Feature**: 001-ai-planning-assistant  
**Date**: February 16, 2026  
**Purpose**: Technical research findings for Phase 0 unknowns

---

## T000: Azure OpenAI Integration via Azure AI Foundry

### Overview
Azure AI Foundry provides unified access to Azure OpenAI models through a consistent SDK. For reasoning-heavy planning tasks, we target GPT-4 Turbo with extended thinking or o1-preview/o1-mini models.

### SDK Pattern (Python)

```python
from azure.ai.inference import ChatCompletionsClient
from azure.core.credentials import AzureKeyCredential

# Initialize client
endpoint = "https://<your-resource>.openai.azure.com/"
credential = AzureKeyCredential("<your-api-key>")
client = ChatCompletionsClient(endpoint=endpoint, credential=credential)

# For reasoning models (o1-preview, o1-mini)
response = client.complete(
    model="o1-preview",  # or "gpt-4-turbo" with reasoning prompts
    messages=[
        {"role": "user", "content": "<planning problem>"}
    ],
    max_tokens=4000,
    temperature=1.0  # o1 models ignore temperature
)

# Access reasoning trace (if available)
reasoning = response.choices[0].message.get("reasoning_content", "")
answer = response.choices[0].message.content
```

### Latency Expectations
- **GPT-4 Turbo**: 20-60 seconds for complex prompts
- **o1-preview**: 2-4 minutes (extended reasoning time)
- **o1-mini**: 30-90 seconds (faster reasoning)

**Recommendation**: Use o1-mini for MVP (balance of reasoning quality and speed)

### Best Practices
1. **Structured prompts**: Use JSON schema for planning inputs/outputs
2. **Streaming**: Enable for user feedback during long inferences
3. **Error handling**: Implement exponential backoff for rate limits
4. **Token management**: reasoning tokens count toward quota; monitor usage

### Integration with FastAPI

```python
# backend/src/services/ai_service.py
import asyncio
from azure.ai.inference.aio import ChatCompletionsClient

class AzureOpenAIService:
    def __init__(self, endpoint: str, api_key: str):
        self.client = ChatCompletionsClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(api_key)
        )
    
    async def generate_plan(self, prompt: str, model: str = "o1-mini"):
        response = await self.client.complete(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4000
        )
        return {
            "plan": response.choices[0].message.content,
            "reasoning": response.choices[0].message.get("reasoning_content", "")
        }
```

---

## T001: Microsoft Agent Framework Orchestration

### Overview
Microsoft Agent Framework enables multi-step agentic workflows with tools, memory, and orchestration. Ideal for planning workflows with multiple validation/optimization steps.

### Architecture Pattern

```python
from agent_framework import Agent, Tool, Orchestrator

# Define tools
class PlanningTools:
    @Tool(name="parse_spreadsheet", description="Parse uploaded planning data")
    def parse_spreadsheet(self, file_path: str) -> dict:
        # Parse CSV/Excel into Task/Resource/Constraint objects
        return {"tasks": [...], "resources": [...], "constraints": [...]}
    
    @Tool(name="validate_constraints", description="Check constraint feasibility")
    def validate_constraints(self, plan_data: dict) -> dict:
        # Validate dependencies, resource availability, deadlines
        return {"feasible": True, "conflicts": []}
    
    @Tool(name="generate_plan", description="Generate optimized plan via AI")
    async def generate_plan(self, plan_data: dict, constraints: dict) -> dict:
        # Call Azure OpenAI with structured prompt
        prompt = self._build_planning_prompt(plan_data, constraints)
        ai_response = await self.ai_service.generate_plan(prompt)
        return self._parse_plan_response(ai_response)

# Agent setup
planning_agent = Agent(
    name="PlanningAgent",
    tools=[PlanningTools()],
    model="o1-mini",  # Azure OpenAI model
    system_prompt="You are an expert shipyard planning assistant..."
)

# Orchestration
orchestrator = Orchestrator()
result = await orchestrator.run(
    agent=planning_agent,
    task="Generate optimized plan for uploaded data"
)
```

### Multi-Step Workflow

```
User Upload → Parse Tool → Validate Tool → Generate Plan Tool → Compare Tool
                                                                    ↓
                                                            Extract Reasoning
```

### Best Practices
1. **Tool granularity**: Each tool does ONE thing well
2. **Error propagation**: Tools return structured errors for agent retry
3. **State management**: Use agent memory for iterative refinement
4. **Prompt engineering**: System prompt defines agent's planning expertise

### Integration Point

```python
# backend/src/agents/planning_agent.py
from agent_framework import Agent
from .tools import parse_tool, validate_tool, generate_tool, compare_tool

async def create_planning_agent(ai_service):
    agent = Agent(
        name="ShipyardPlanningAgent",
        tools=[parse_tool, validate_tool, generate_tool, compare_tool],
        model="o1-mini",
        system_prompt="""You are an AI planning assistant for shipyard and port logistics.
        Your goal is to generate feasible, optimized plans that:
        - Respect all constraints (dependencies, resources, deadlines, costs)
        - Maximize capacity utilization
        - Minimize schedule duration
        - Provide clear explanations for all decisions
        """
    )
    return agent
```

---

## T002: Schema Inference for Spreadsheet Parsing

### Challenge
Users upload planning spreadsheets in various formats. We need flexible parsing that infers structure without enforcing rigid schemas.

### Approach: Column Name Matching + Heuristics

```python
import pandas as pd
import re

class FlexibleSpreadsheetParser:
    # Known column patterns
    COLUMN_PATTERNS = {
        "task_id": [r"task.*id", r"id", r"task.*number"],
        "task_name": [r"task.*name", r"name", r"description", r"activity"],
        "duration": [r"duration", r"days", r"hours", r"length"],
        "start_date": [r"start.*date", r"begin", r"start"],
        "end_date": [r"end.*date", r"finish", r"complete"],
        "resource": [r"resource", r"assigned.*to", r"owner", r"crew"],
        "dependencies": [r"depend", r"predecessor", r"follows"],
        "cost": [r"cost", r"budget", r"price"],
    }
    
    def parse(self, file_path: str) -> dict:
        # Load data
        df = self._load_file(file_path)
        
        # Infer column mappings
        column_map = self._infer_columns(df.columns)
        
        # Extract entities
        tasks = self._extract_tasks(df, column_map)
        resources = self._extract_resources(df, column_map)
        constraints = self._infer_constraints(tasks)
        
        return {
            "tasks": tasks,
            "resources": resources,
            "constraints": constraints,
            "metadata": {"source": file_path, "row_count": len(df)}
        }
    
    def _infer_columns(self, columns: list) -> dict:
        mapping = {}
        for col in columns:
            col_lower = col.lower().strip()
            for entity_field, patterns in self.COLUMN_PATTERNS.items():
                for pattern in patterns:
                    if re.search(pattern, col_lower):
                        mapping[entity_field] = col
                        break
        return mapping
    
    def _load_file(self, file_path: str):
        if file_path.endswith('.csv'):
            return pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            return pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported format: {file_path}")
```

### Fallback Strategy
If critical columns (task_id, task_name, duration) cannot be inferred:
1. Return error with clear message: "Could not detect required columns: task_id, task_name, duration"
2. Suggest column renaming or provide template CSV

### Sample Data Format (Expected)

```csv
Task ID,Task Name,Duration (days),Start Date,End Date,Resource,Dependencies,Cost
T001,Hull Assembly,14,2026-03-01,2026-03-15,Crane A,None,50000
T002,Engine Installation,7,2026-03-16,2026-03-23,Crane A + Crew B,T001,30000
T003,Electrical Wiring,10,2026-03-16,2026-03-26,Crew C,T001,20000
```

### Best Practices
1. **Permissive matching**: Accept common synonyms (e.g., "Activity" = "Task Name")
2. **Date parsing**: Use `pd.to_datetime()` with flexible formats
3. **Validation**: Flag missing required fields early
4. **User feedback**: Return warnings for ambiguous mappings

---

## Integration Summary

### Data Flow

```
CSV/Excel Upload
    ↓
[FlexibleSpreadsheetParser] → Parse & infer schema
    ↓
[Agent Tool: parse_spreadsheet] → Structured plan data
    ↓
[Agent Tool: validate_constraints] → Feasibility check
    ↓
[Azure OpenAI via Agent Tool: generate_plan] → AI reasoning + optimized plan
    ↓
[Comparison Service] → Highlight differences vs original
    ↓
[Frontend] → Side-by-side view + explanations
```

### Technology Stack Alignment

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Spreadsheet parsing | pandas + openpyxl | Standard, robust, flexible |
| Schema inference | Regex + heuristics | No ML overhead; fast; transparent |
| AI orchestration | Microsoft Agent Framework | Built for multi-step workflows |
| AI inference | Azure OpenAI (o1-mini) | Best reasoning quality; Azure integration |
| State persistence | SQLite (local) | Sufficient for single-user demo |

---

## Phase 0 Completion Checklist

- [x] T000: Azure OpenAI integration pattern documented
- [x] T001: Agent Framework orchestration pattern documented
- [x] T002: Schema inference strategy documented
- [x] Integration patterns defined
- [x] Latency expectations set (3-5 minutes)
- [x] Best practices identified for each component

**Status**: Phase 0 Research Complete  
**Next**: Proceed to Phase 1 (Setup)
