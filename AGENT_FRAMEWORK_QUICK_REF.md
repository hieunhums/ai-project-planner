# Quick Reference: Microsoft Agent Framework Patterns

## Installation Checklist
```bash
# Core packages
pip install agent-framework azure-identity azure-ai-projects

# FastAPI integration
pip install fastapi uvicorn python-multipart

# Data handling
pip install pydantic pandas openpyxl aiofiles

# Azure OpenAI for nested calls
pip install openai>=1.3.0
```

## Authentication Setup (One-Time)
```python
# Option 1: Entra ID (Recommended)
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()  
# Uses: Azure CLI login → environment variables → managed identity

# Verify:
# az login
# az account show  
```

## Agent Creation Pattern (Canonical)
```python
from agent_framework.azure import AzureAIClient
import asyncio

async def create_agent():
    credential = DefaultAzureCredential()
    
    async with AzureAIClient(
        project_endpoint="https://PROJECT-NAME.ai.azure.com/projects/default",
        model_deployment_name="gpt-5.2-reasoning",
        credential=credential,
    ).create_agent(
        name="my-agent",
        instructions="You are helpful... ",
        tools=[tool_func1, tool_func2],  # List of Python functions
    ) as agent:
        
        # Single turn
        result = await agent.run("What is 2+2?")
        print(result.text)
        
        # Multi-turn (with thread)
        thread = agent.get_new_thread()
        async for chunk in agent.run_stream("First question", thread=thread):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        
        async for chunk in agent.run_stream("Follow-up question", thread=thread):
            if chunk.text:
                print(chunk.text, end="", flush=True)
```

## Tool Definition Pattern (Standard)
```python
from typing import Annotated

def my_tool(
    param1: Annotated[str, "Description of param1"],
    param2: Annotated[int, "Description of param2"] = 10,
) -> str:
    """
    Tool docstring (required).
    Describes what tool does.
    
    Returns:
        JSON string or plain text result
    """
    result = f"Processing {param1} with param2={param2}"
    return result

# Pass to agent
agent_instance.tools = [my_tool, another_tool, ...]
```

## State Management Pattern (Planning Workflows)
```python
class WorkflowState:
    def __init__(self):
        self.thread = None  # Created: agent.get_new_thread()
        self.artifacts = {
            "step1_output": None,
            "step2_output": None,
        }
    
    async def step1(self, agent):
        thread = agent.get_new_thread()  # Fresh thread
        result = await agent.run("Step 1 instruction", thread=thread)
        self.artifacts["step1_output"] = result.text
        return self  # Chainable
    
    async def step2(self, agent):
        thread = agent.get_new_thread()  # Fresh thread
        instruction = f"Step 2, given {self.artifacts['step1_output']}"
        result = await agent.run(instruction, thread=thread)
        self.artifacts["step2_output"] = result.text
        return self

# Usage
state = WorkflowState()
await state.step1(agent).step2(agent)
```

## FastAPI Streaming Endpoint
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/stream-planning")
async def stream_planning(file_content: str):
    async def generate():
        agent = ...  # Initialize
        thread = agent.get_new_thread()
        
        async for chunk in agent.run_stream(file_content, thread=thread):
            if chunk.text:
                yield b"data: " + chunk.text.encode() + b"\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

## Error Handling Template
```python
from functools import wraps
import asyncio

def with_timeout(timeout_sec: float = 30):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout_sec)
            except asyncio.TimeoutError:
                logger.error(f"{func.__name__} timed out after {timeout_sec}s")
                raise
            except Exception as e:
                logger.error(f"{func.__name__} error: {e}")
                raise
        return wrapper
    return decorator

@with_timeout(timeout_sec=30)
async def my_agent_call(agent):
    return await agent.run("instruction")
```

## Choosing Foundry Models for Planning

| Use Case | Model | Why |
|----------|-------|-----|
| Multi-step reasoning, constraints | **gpt-5.2-reasoning** | Best reasoning-to-cost ratio |
| Complex logic, explainability | claude-opus-4.5 | Superior reasoning quality |
| Fast planning, quick decisions | gpt-5 | Good speed + quality balance |
| Code-centric workflows | gpt-5.1-codex | Strong algorithm synthesis |
| Budget-first | gpt-5-mini | Cost-effective, reasonable quality |

**Recommendation**: Start with `gpt-5.2-reasoning`

## Common Pitfalls & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| "Agent not found" error | Wrong project endpoint | Verify: `az account show` → subscription → resource group → AI project |
| Tool not called even though needed | Tool not in agent definition | Pass `tools=[...]` to `create_agent()` |
| Async/await issues | Mixing sync/async | Use `async with` for context managers; `await` all async calls |
| Slow response | Model overloaded or long reasoning | Switch to faster model (gpt-5-mini); reduce max_tokens |
| Thread not persisting state | Creating new thread each call | Reuse: `thread = agent.get_new_thread()` once; pass to all calls |

## Production Checklist

- [ ] Configure DefaultAzureCredential (Entra ID, not API keys)
- [ ] Implement circuit breaker for Foundry API calls
- [ ] Add structured logging (not print statements)
- [ ] Test with timeout_sec < 60 for FastAPI timeouts
- [ ] Persist session state to database (not in-memory)
- [ ] Monitor token usage (especially for o1/o3 reasoning models)
- [ ] Set max_tokens limits to prevent runaway costs
- [ ] Use `run_stream` for better UX (vs. single `run`)
- [ ] Store artifact history for audit trails

## Useful Commands

```bash
# Verify Azure setup
az account show
az account get-access-token

# Test Foundry connection
python -c "from azure.identity import DefaultAzureCredential; print(DefaultAzureCredential().get_token('https://cognitiveservices.azure.com/.default'))"

# FastAPI dev server
uvicorn main:app --reload --log-level debug

# Kubernetes deploy
kubectl apply -f deployment.yaml
kubectl logs -f deploy/planning-agent
```

## Links & Resources

- Agent Framework Docs: https://github.com/microsoft/agent-framework (Python SDK)
- Azure AI Foundry: https://ai.azure.com/
- OpenAI/Reasoning Models: https://platform.openai.com/docs/
- FastAPI Async: https://fastapi.tiangolo.com/async-sql-databases/

---

**Last Updated**: 2026-02-16  
**For**: Planning Optimization with AI Agents
