# Azure AI Foundry + FastAPI Integration Guide for Reasoning Models

## Executive Summary

This guide provides comprehensive documentation for integrating Azure AI Foundry's advanced reasoning models (GPT-5 series, o3 series) with Python FastAPI applications. Reasoning models deliver enhanced problem-solving capabilities but require careful latency management and proper error handling for production deployments.

---

## 1. Azure AI Foundry Python SDK Setup & Authentication

### Installation

```bash
# Core Foundry SDK
pip install azure-ai-projects==1.0.0b10 azure-identity

# For direct OpenAI API usage (recommended for Responses API)
pip install openai>=1.3.0

# Additional utilities
pip install python-dotenv
```

### SDK Versions
- **Azure AI Projects SDK 1.x** (Classic Foundry) - Use for most use cases
- **Azure AI Projects SDK 2.x Preview** - Newer portal-based projects (not yet recommended for production)

### Authentication Patterns

#### Option 1: Azure Entra ID (Recommended for Production)
```python
from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), 
    "https://cognitiveservices.azure.com/.default"
)

client = OpenAI(
    base_url="https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/",
    api_key=token_provider,  # Automatic token refresh
)
```

**Prerequisites:**
- Azure CLI installed and authenticated: `az login`
- User has **Azure AI User** role or higher on Foundry project
- RBAC Role-Based Access Control configured

#### Option 2: API Key Authentication (Development/Testing)
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/",
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),  # Load from env variables
)
```

**Security Note:** Never hardcode API keys. Use Azure Key Vault for production.

#### Option 3: Azure AI Projects SDK (Native Foundry)
```python
import os
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

project = AIProjectClient(
    endpoint="https://your-resource.ai.azure.com/api/projects/your-project",
    credential=DefaultAzureCredential(),
)

# Get OpenAI client from project
models = project.get_openai_client(api_version="2024-10-21")
```

### Verification Script
```python
from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

# Test authentication
token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), 
    "https://cognitiveservices.azure.com/.default"
)

client = OpenAI(
    base_url="https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/",
    api_key=token_provider,
)

# Verify setup with a simple call
response = client.chat.completions.create(
    model="gpt-4o",  # Test with non-reasoning model first
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=10,
)
print("✓ Authentication successful!")
```

---

## 2. Calling Reasoning Models with Extended Thinking

### Available Reasoning Models

| Model | Context | Output | Best For | Effort Levels |
|-------|---------|--------|----------|----------------|
| **gpt-5** | 400K tokens (272K in / 128K out) | Max 128K tokens | Complex multi-step reasoning | medium, high |
| **gpt-5-mini** | 400K tokens | Max 128K tokens | Cost-optimized reasoning | medium, high |
| **gpt-5-nano** | 400K tokens | Max 128K tokens | Quick reasoning tasks | low, medium |
| **o3** | 300K tokens (200K in / 100K out) | Max 100K tokens | Advanced reasoning | low, medium, high |
| **o3-mini** | 300K tokens | Max 100K tokens | Lightweight reasoning | low, medium |

### Pattern 1: Chat Completions API with Reasoning

```python
from openai import OpenAI
import json

client = OpenAI(
    base_url="https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/",
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
)

# Call reasoning model with extended thinking
response = client.chat.completions.create(
    model="gpt-5",  # Replace with your deployment name
    messages=[
        {
            "role": "developer",
            "content": "You are an expert planning optimizer. Analyze project requirements deeply."
        },
        {
            "role": "user",
            "content": """Optimize this project timeline:
            - 10 tasks with dependencies
            - 3 team members available
            - Critical path: design -> development -> testing
            
            Provide detailed recommendations."""
        },
    ],
    max_completion_tokens=5000,  # Token budget for reasoning
    reasoning_effort="medium",   # low, medium, high
)

# Extract reasoning and final answer
print("Response:", response.choices[0].message.content)
```

### Pattern 2: Responses API (Preferred for Advanced Use Cases)

The newer **Responses API** is optimized for reasoning models and supports streaming:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/",
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
)

response = client.responses.create(
    model="gpt-5",
    input="Analyze: How to design a scalable microservices architecture?",
    reasoning={
        "effort": "high",  # Extended reasoning time
        "summary": "auto"  # auto, concise, or detailed
    },
    text={
        "verbosity": "low"  # New with GPT-5: control verbosity
    }
)

print("Output text:", response.output_text)
```

### Pattern 3: FastAPI Integration

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI, APIError, RateLimitError
import asyncio

app = FastAPI()
client = OpenAI(
    base_url="https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/",
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
)

class PlanningRequest(BaseModel):
    project_description: str
    constraints: str
    optimization_goals: list[str]

class PlanningResponse(BaseModel):
    reasoning_time_ms: int
    recommendation: str
    confidence_score: float

@app.post("/api/optimize-plan", response_model=PlanningResponse)
async def optimize_plan(request: PlanningRequest):
    """Advanced planning optimization using reasoning models."""
    try:
        import time
        start_time = time.time()
        
        # Call reasoning model
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {
                    "role": "developer",
                    "content": "You are an expert project optimizer."
                },
                {
                    "role": "user",
                    "content": f"""
                    Project: {request.project_description}
                    Constraints: {request.constraints}
                    Goals: {', '.join(request.optimization_goals)}
                    
                    Provide detailed optimization plan.
                    """
                }
            ],
            max_completion_tokens=4000,
            reasoning_effort="high",  # Extended thinking enabled
        )
        
        reasoning_time_ms = int((time.time() - start_time) * 1000)
        
        return PlanningResponse(
            reasoning_time_ms=reasoning_time_ms,
            recommendation=response.choices[0].message.content,
            confidence_score=0.95,
        )
        
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    except APIError as e:
        raise HTTPException(status_code=500, detail=f"Model error: {str(e)}")
```

---

## 3. Expected Latency for Reasoning Models

### Latency Factors

Reasoning models exhibit higher latency due to extended thinking process:

| Factor | Impact | Notes |
|--------|--------|-------|
| **Reasoning Effort** | Critical | `high` effort = 30-90s additional latency |
| **Model Type** | Critical | GPT-5: ↑30-40s TTFT; GPT-4.1: ↑5-10s TTFT |
| **Prompt Size** | Moderate | Large prompts add 2-5s (per 50K tokens) |
| **Output Size** | High | Each token generation extends latency |
| **System Load** | Moderate | Shared endpoints have variable latency |

### Latency Benchmarks (30-60 second tasks)

```
Chart: Expected Response Times for Reasoning Models

Scenario: "Complex optimization problem with high reasoning effort"

gpt-5-high-effort (~45-90s):
████████████████████████████████████████████████████████████ (60-120s)
Time to First Token (TTFT): 30-50s
Time Between Tokens (TBT): 100-200ms

gpt-5-medium-effort (~20-45s):
████████████████████████████ (30-60s)
TTFT: 15-25s
TBT: 80-150ms

gpt-5-nano-medium-effort (~10-20s):
██████████████ (15-30s)
TTFT: 5-10s
TBT: 50-100ms

gpt-4.1 (non-reasoning) (~3-8s):
███ (3-8s)
TTFT: 1-2s
TBT: 20-50ms
```

### Latency Management Recommendations

**For interactive applications (< 10 second timeout):**
- Use GPT-4.1 instead of reasoning models
- Use `reasoning_effort="low"` if unavoidable
- Implement async processing with background jobs

**For planning/optimization tasks (30-60 second timeout):**
- Set HTTP client timeout to 120+ seconds
- Use `reasoning_effort="high"` safely
- Implement streaming for partial results

**Streaming Implementation:**
```python
@app.post("/api/stream-plan")
async def stream_plan(request: PlanningRequest):
    """Stream reasoning model output as it becomes available."""
    def generate():
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {
                    "role": "user",
                    "content": request.project_description
                }
            ],
            max_completion_tokens=4000,
            reasoning_effort="high",
            stream=True,  # Enable streaming
        )
        
        for chunk in response:
            token = chunk.choices[0].delta.content
            if token:
                yield f"data: {token}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

---

## 4. Input/Output Schema for Planning Optimization

### Request Schema

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class TaskDefinition(BaseModel):
    id: str
    name: str
    duration_hours: float
    dependencies: List[str] = Field(default_factory=list)
    resource_requirements: Dict[str, float]
    priority: int = Field(ge=1, le=5)

class ResourceAvailability(BaseModel):
    resource_type: str
    available_units: float
    cost_per_hour: float
    constraints: Optional[str] = None

class OptimizationRequest(BaseModel):
    project_id: str
    project_name: str
    tasks: List[TaskDefinition]
    resources: List[ResourceAvailability]
    optimization_goals: List[str] = Field(
        default=["minimize_duration", "optimize_cost"]
    )
    constraints: Optional[str] = None
    ai_effort: str = Field(
        default="medium",
        description="low, medium, or high reasoning effort"
    )

class OptimizationRequest(BaseModel):
    """Input schema for reasoning model optimization."""
    
    # Project metadata
    project_id: str = Field(..., description="Unique project identifier")
    project_name: str
    
    # Task definitions
    tasks: List[TaskDefinition] = Field(
        ..., 
        description="List of project tasks with dependencies"
    )
    
    # Resource constraints
    resources: List[ResourceAvailability]
    available_budget: float
    
    # Optimization parameters
    optimization_goals: List[str] = Field(
        default=["minimize_duration", "optimize_cost"],
        description="Primary optimization objectives"
    )
    
    # Constraints as free-form text for reasoning model
    custom_constraints: Optional[str] = None
    
    # AI model configuration
    reasoning_effort: str = Field(
        default="medium",
        description="low, medium, or high - affects latency and quality"
    )
```

### Response Schema

```python
class TimelineEntry(BaseModel):
    phase: int
    task_ids: List[str]
    start_day: int
    end_day: int
    assigned_resources: Dict[str, float]

class RiskAssessment(BaseModel):
    risk_category: str
    probability: float  # 0.0 to 1.0
    impact: str  # low, medium, high, critical
    mitigation_strategy: str

class OptimizationResponse(BaseModel):
    """Output from reasoning model optimization."""
    
    # Execution metrics
    reasoning_duration_ms: int
    total_duration_ms: int
    tokens_used: int
    
    # Optimization results
    optimized_timeline: List[TimelineEntry]
    estimated_total_duration_days: float
    estimated_cost: float
    
    # Quality metrics
    optimization_confidence: float  # 0.0 to 1.0
    key_assumptions: List[str]
    
    # Risk analysis
    identified_risks: List[RiskAssessment]
    critical_path: List[str]
    
    # Detailed reasoning (optional, from model)
    detailed_analysis: Optional[str] = None
    alternative_approaches: Optional[List[str]] = None
```

### Prompt Engineering Template

```python
def create_optimization_prompt(request: OptimizationRequest) -> str:
    """Create detailed prompt for reasoning model."""
    
    tasks_text = "\n".join([
        f"- Task {t.id}: {t.name} ({t.duration_hours}h) "
        f"[Dependencies: {', '.join(t.dependencies) or 'None'}]"
        for t in request.tasks
    ])
    
    resources_text = "\n".join([
        f"- {r.resource_type}: {r.available_units} units "
        f"(${r.cost_per_hour}/hr)"
        for r in request.resources
    ])
    
    prompt = f"""
You are an expert project planning optimizer. Analyze this project and provide 
an optimized plan addressing all constraints.

PROJECT: {request.project_name} (ID: {request.project_id})

TASKS:
{tasks_text}

AVAILABLE RESOURCES:
{resources_text}

BUDGET: ${request.available_budget}

OPTIMIZATION GOALS:
{chr(10).join(f"- {goal}" for goal in request.optimization_goals)}

{f"ADDITIONAL CONSTRAINTS: {request.custom_constraints}" if request.custom_constraints else ""}

REQUIRED OUTPUT:
1. Optimized timeline with phases and task assignments
2. Critical path analysis
3. Risk assessment for each identified risk
4. Resource allocation recommendations
5. Cost projections
6. Confidence level (0-100%) for this plan
7. Alternative approaches if applicable

Think step-by-step through dependencies, resource conflicts, and timeline 
constraints before providing recommendations.
"""
    return prompt
```

---

## 5. Cost Considerations & Token Usage Patterns

### Pricing Structure (February 2026)

**Token-based billing:** Charged per 1,000 tokens (input + output combined)

#### GPT-5 Series Pricing
```
Model              | Input Cost   | Output Cost (approx)
gpt-5              | $10/1M       | $40/1M
gpt-5-mini         | $5/1M        | $20/1M
gpt-5-nano         | $2.50/1M     | $10/1M
```

#### Reasoning Model (o3 series) Pricing
```
Model              | Input Cost   | Output Cost (approx)
o3                 | Variable*    | Variable*
o3-mini            | $2/1M        | $8/1M
```
*Enterprise pricing - contact Azure sales

### Cost Estimation for 30-60 Second Tasks

**Example: Complex Planning Optimization**
```
Task: 4000-token prompt + 3000-token response (high reasoning)

Calculation:
- Input tokens: 4,000 @ $10/1M = $0.04
- Output tokens: 3,000 @ $40/1M = $0.12
- Per-call cost: ~$0.16

Monthly (1000 calls/day):
- Daily: 1000 calls × $0.16 = $160
- Monthly: $160 × 30 = $4,800
```

### Token Usage Patterns

**Typical planning optimization request:**
```
Input:
- Project description: 500-1000 tokens
- Task list (15-20 tasks): 1500-2000 tokens
- Constraints: 500-1000 tokens
- Total input: 2500-4000 tokens

Output (High reasoning effort):
- Analysis and reasoning: 2000-3000 tokens (often hidden in reasoning models)
- Timeline and recommendations: 1500-2000 tokens
- Risk analysis: 1000-1500 tokens
- Total output: 4500-6500 tokens

Optimization effort impact on tokens:
- low effort: 3K output tokens
- medium effort: 4-5K output tokens
- high effort: 5-7K output tokens
```

### Cost Optimization Strategies

```python
# Strategy 1: Use cheaper models for simpler tasks
if complexity_score < 3:
    model = "gpt-5-nano"  # Cheapest option
    reasoning_effort = "low"
elif complexity_score < 7:
    model = "gpt-5-mini"
    reasoning_effort = "medium"
else:
    model = "gpt-5"
    reasoning_effort = "high"

# Strategy 2: Batch requests during off-peak hours
# Strategy 3: Cache common project templates
# Strategy 4: Use streaming to avoid redundant full responses
# Strategy 5: Prompt optimization to reduce input tokens
```

### Monthly Cost Projection

```
Scenarios for project planning service:

Low volume (100 calls/month):
- Avg per call: $0.16 (GPT-5)
- Monthly cost: ~$16

Medium volume (1000 calls/month):
- Using model selection: avg $0.12/call
- Monthly cost: ~$120

High volume (10,000 calls/month):
- Using cached templates + model selection: avg $0.08/call
- Monthly cost: ~$800
```

---

## 6. Error Handling, Retries & Timeout Management

### Error Types & Recovery Strategies

```python
from openai import (
    OpenAI,
    APIError,
    APIConnectionError,
    RateLimitError,
    APIStatusError,
    APITimeoutError,
)
from typing import Optional, Callable, TypeVar
import time
import asyncio

T = TypeVar('T')

class RetryConfig:
    """Configuration for retry behavior."""
    max_retries: int = 5
    initial_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True

def retry_with_exponential_backoff(
    func: Callable[[], T],
    config: Optional[RetryConfig] = None,
) -> T:
    """
    Retry function with exponential backoff and jitter.
    
    Handles:
    - Rate limit errors (429)
    - Timeout errors (408)
    - Temporary service errors (500, 502, 503, 504)
    """
    config = config or RetryConfig()
    delay = config.initial_delay
    
    for attempt in range(config.max_retries):
        try:
            return func()
        except RateLimitError as e:
            # 429: Rate limit exceeded
            if attempt == config.max_retries - 1:
                raise
            
            # Calculate backoff with jitter
            if config.jitter:
                import random
                jitter = delay * (1 + random.random())
                actual_delay = min(jitter, config.max_delay)
            else:
                actual_delay = min(delay, config.max_delay)
            
            print(f"Rate limit hit. Waiting {actual_delay:.1f}s before retry {attempt + 1}/{config.max_retries}")
            time.sleep(actual_delay)
            delay *= config.exponential_base
            
        except (APIConnectionError, APITimeoutError) as e:
            # Connection/timeout errors - retry
            if attempt == config.max_retries - 1:
                raise
            
            actual_delay = min(delay, config.max_delay)
            print(f"Connection error: {type(e).__name__}. Retrying in {actual_delay:.1f}s")
            time.sleep(actual_delay)
            delay *= config.exponential_base
            
        except APIStatusError as e:
            # Check if retryable status code
            if e.status_code in [408, 500, 502, 503, 504]:
                if attempt == config.max_retries - 1:
                    raise
                
                actual_delay = min(delay, config.max_delay)
                print(f"Retryable error {e.status_code}. Waiting {actual_delay:.1f}s")
                time.sleep(actual_delay)
                delay *= config.exponential_base
            else:
                # Non-retryable error
                raise
```

### Timeout Configuration for Planning Tasks

```python
from openai import OpenAI
import httpx

# Set appropriate timeouts for reasoning models (30-120 seconds)
client = OpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    base_url="https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/",
    timeout=120.0,  # 2 minutes for high-effort reasoning
    max_retries=3,
)

# For chat completions
try:
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[...],
        max_completion_tokens=5000,
        reasoning_effort="high",
        request_timeout=120,  # Request-level timeout override
    )
except APITimeoutError:
    print("Reasoning model inference timed out after 120 seconds")
    # Fallback to faster model or incremental processing
```

### FastAPI Error Handling Middleware

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    """Comprehensive error handling for API requests."""
    try:
        response = await call_next(request)
        return response
    except RateLimitError as e:
        logger.warning(f"Rate limit exceeded: {e}")
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "retry_after_seconds": 60,
                "message": "Too many requests. Please try again later."
            }
        )
    except APITimeoutError as e:
        logger.error(f"Reasoning model timeout: {e}")
        return JSONResponse(
            status_code=504,
            content={
                "error": "Model inference timeout",
                "message": "The reasoning model took longer than expected. Consider using a simpler model or reducing reasoning effort.",
                "suggestion": "Use 'reasoning_effort=low' for faster responses"
            }
        )
    except APIStatusError as e:
        logger.error(f"API error {e.status_code}: {e}")
        if e.status_code == 401:
            return JSONResponse(status_code=401, content={"error": "Authentication failed"})
        elif e.status_code == 429:
            return JSONResponse(status_code=429, content={"error": "Rate limited"})
        else:
            return JSONResponse(
                status_code=500,
                content={"error": f"Service error ({e.status_code})"}
            )
    except APIConnectionError as e:
        logger.error(f"Connection error: {e}")
        return JSONResponse(
            status_code=503,
            content={"error": "Service unavailable", "message": "Could not reach AI service"}
        )
    except APIError as e:
        logger.error(f"Unexpected API error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )

# Usage in endpoints
@app.post("/api/optimize-plan")
async def optimize_plan(request: PlanningRequest):
    """Planning endpoint with built-in retry logic."""
    
    def call_model():
        return client.chat.completions.create(
            model="gpt-5",
            messages=[...],
            max_completion_tokens=5000,
            reasoning_effort="medium",
        )
    
    # Automatic retry with backoff
    response = retry_with_exponential_backoff(call_model)
    return {"optimization": response.choices[0].message.content}
```

### Health Check & Circuit Breaker Pattern

```python
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"       # Working normally
    OPEN = "open"          # Too many errors, fail fast
    HALF_OPEN = "half_open"  # Testing if service recovered

class CircuitBreaker:
    """Prevent cascading failures from failing model service."""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    def call(self, func: Callable[[], T]) -> T:
        """Execute function with circuit breaker protection."""
        
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN - service unavailable")
        
        try:
            result = func()
            self._reset()
            return result
        except self.expected_exception as e:
            self._record_failure()
            raise
    
    def _record_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")
    
    def _reset(self):
        self.failure_count = 0
        self.last_failure_time = None
        if self.state != CircuitState.CLOSED:
            self.state = CircuitState.CLOSED
            logger.info("Circuit breaker closed - service recovered")
    
    def _should_attempt_reset(self) -> bool:
        return (
            self.last_failure_time and
            datetime.now() - self.last_failure_time >= timedelta(seconds=self.recovery_timeout)
        )

# Usage
breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=120)

@app.post("/api/optimize")
async def optimize(request: PlanningRequest):
    def safe_call():
        return client.chat.completions.create(...)
    
    response = breaker.call(safe_call)
    return response

@app.get("/health")
async def health_check():
    return {
        "status": "ok" if breaker.state == CircuitState.CLOSED else "degraded",
        "circuit_state": breaker.state.value,
        "failures": breaker.failure_count,
    }
```

---

## 7. Complete FastAPI Example: Project Planning Service

```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from openai import OpenAI, RateLimitError, APITimeoutError, APIError
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from typing import List, Optional, Dict
import os
import time
import json
import asyncio
from datetime import datetime

# ============================================================================
# Configuration & Setup
# ============================================================================

app = FastAPI(
    title="AI Project Planner",
    description="Advanced project planning using Azure AI Foundry reasoning models"
)

# Initialize client
token_provider = get_bearer_token_provider(
    DefaultAzureCredential(),
    "https://cognitiveservices.azure.com/.default"
)

client = OpenAI(
    base_url=os.getenv("FOUNDRY_ENDPOINT", "https://YOUR-RESOURCE.openai.azure.com/openai/v1/"),
    api_key=token_provider,
    timeout=120.0,
    max_retries=3,
)

# ============================================================================
# Request/Response Models
# ============================================================================

class TaskEdgeCase(BaseModel):
    id: str
    duration_hours: float
    dependencies: List[str] = Field(default_factory=list)
    resources_needed: Dict[str, float]
    risk_level: str = "low"  # low, medium, high

class PlanningRequest(BaseModel):
    project_name: str
    description: str
    tasks: List[TaskEdgeCase]
    constraints: str
    reasoning_effort: str = "medium"

class PlanPhase(BaseModel):
    phase_number: int
    task_ids: List[str]
    duration_days: float
    start_date: Optional[str] = None

class PlanningResponse(BaseModel):
    project_id: str
    reasoning_duration_ms: int
    total_duration_ms: int
    optimized_plan: List[PlanPhase]
    critical_path: List[str]
    confidence_score: float
    key_risks: List[str]
    recommendations: str

# ============================================================================
# Core Planning Function
# ============================================================================

def optimize_project_plan(request: PlanningRequest) -> PlanningResponse:
    """Call reasoning model to optimize project plan."""
    
    start_time = time.time()
    
    # Build detailed prompt
    tasks_description = "\n".join([
        f"- {task.id}: {task.duration_hours}h (Dependencies: {', '.join(task.dependencies) or 'None'})"
        for task in request.tasks
    ])
    
    prompt = f"""
You are an expert project manager. Optimize this project plan:

PROJECT: {request.project_name}
DESCRIPTION: {request.description}

TASKS:
{tasks_description}

CONSTRAINTS: {request.constraints}

Provide:
1. Optimized execution phases
2. Critical path identification
3. Risk assessment
4. Key recommendations for success

Format your response as JSON with keys: phases, critical_path, risks, recommendations
"""
    
    # Call reasoning model
    reasoning_start = time.time()
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "user", "content": prompt}
        ],
        max_completion_tokens=4000,
        reasoning_effort=request.reasoning_effort,
        temperature=0.7,
    )
    reasoning_duration_ms = int((time.time() - reasoning_start) * 1000)
    
    # Parse response
    content = response.choices[0].message.content
    
    # Extract JSON from response (handle markdown code blocks)
    if "```json" in content:
        json_str = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        json_str = content.split("```")[1].split("```")[0]
    else:
        json_str = content
    
    try:
        plan_data = json.loads(json_str)
    except json.JSONDecodeError:
        plan_data = {"phases": [], "critical_path": [], "risks": [], "recommendations": content}
    
    # Build response
    total_duration_ms = int((time.time() - start_time) * 1000)
    
    # Convert phases
    phases = [
        PlanPhase(
            phase_number=i + 1,
            task_ids=phase.get("tasks", []),
            duration_days=phase.get("duration", 0),
        )
        for i, phase in enumerate(plan_data.get("phases", []))
    ]
    
    return PlanningResponse(
        project_id=f"proj_{int(time.time())}",
        reasoning_duration_ms=reasoning_duration_ms,
        total_duration_ms=total_duration_ms,
        optimized_plan=phases,
        critical_path=plan_data.get("critical_path", []),
        confidence_score=0.85,
        key_risks=plan_data.get("risks", []),
        recommendations=plan_data.get("recommendations", ""),
    )

# ============================================================================
# API Endpoints
# ============================================================================

@app.post("/api/plans/optimize", response_model=PlanningResponse)
async def optimize_plan(request: PlanningRequest):
    """Optimize project plan using reasoning model."""
    try:
        # Run with timeout
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, optimize_project_plan, request),
            timeout=120.0
        )
        return result
        
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Planning optimization timed out. Try with reasoning_effort='low'"
        )
    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please retry after 60 seconds."
        )
    except APITimeoutError:
        raise HTTPException(
            status_code=504,
            detail="AI model inference timeout"
        )
    except APIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )

@app.post("/api/plans/stream")
async def stream_plan(request: PlanningRequest):
    """Stream planning results as they are generated."""
    
    def generate():
        try:
            # Build prompt
            tasks_description = "\n".join([
                f"- {task.id}: {task.duration_hours}h"
                for task in request.tasks
            ])
            
            response = client.chat.completions.create(
                model="gpt-5",
                messages=[
                    {
                        "role": "user",
                        "content": f"Optimize: {request.project_name}\n\nTasks:\n{tasks_description}"
                    }
                ],
                max_completion_tokens=3000,
                reasoning_effort=request.reasoning_effort,
                stream=True,
            )
            
            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield f"data: {chunk.choices[0].delta.content}\n\n"
                    
        except Exception as e:
            yield f"data: ERROR: {str(e)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "AI Project Planner",
        "timestamp": datetime.utcnow().isoformat(),
        "reasoning_models": ["gpt-5", "gpt-5-mini"],
    }

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Running the Service

```bash
# Set environment variables
export FOUNDRY_ENDPOINT="https://YOUR-RESOURCE.openai.azure.com/openai/v1/"
export AZURE_SUBSCRIPTION_ID="..."

# Install dependencies
pip install fastapi uvicorn openai azure-identity

# Run server
python main.py

# Test endpoint
curl -X POST "http://localhost:8000/api/plans/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Website Redesign",
    "description": "Complete redesign of company website",
    "tasks": [
      {"id": "design", "duration_hours": 40, "dependencies": [], "resources_needed": {"designer": 1}},
      {"id": "frontend", "duration_hours": 80, "dependencies": ["design"], "resources_needed": {"developer": 2}},
      {"id": "testing", "duration_hours": 30, "dependencies": ["frontend"], "resources_needed": {"qa": 1}}
    ],
    "constraints": "Budget: $50,000. Team: 3 people. Timeline: 8 weeks max.",
    "reasoning_effort": "high"
  }'
```

---

## Summary Table: Quick Reference

| Aspect | Recommendation | Details |
|--------|---|---|
| **SDK** | `openai >= 1.3.0` | Most compatible, recommended for Responses API |
| **Authentication** | Azure Entra ID + `DefaultAzureCredential` | Most secure, automatic token refresh |
| **Model for Complex Reasoning** | `gpt-5` or `o3` | Use high reasoning effort for 30-60s tasks |
| **Model for Speed** | `gpt-4.1` or `gpt-5-nano` | Use when < 10 second latency required |
| **Timeout** | 120+ seconds | Critical for reasoning models |
| **Retry Strategy** | Exponential backoff, max 5 attempts | Handles rate limits and transient errors |
| **Cost Optimization** | Model selection based on complexity | `gpt-5-nano` for simple, `gpt-5` for complex |
| **Streaming** | Use for long-running tasks | Improves perceived latency |
| **Fallback** | Cascade to `gpt-4.1` on timeout | Fast fallback for critical operations |

---

## References

- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-foundry/)
- [Reasoning Models Guide](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/reasoning)
- [Responses API](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/responses)
- [Latency Optimization](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/latency)
- [Pricing & Costs](https://learn.microsoft.com/azure/ai-foundry/concepts/manage-costs)
- [Rate Limits & Quotas](https://learn.microsoft.com/azure/ai-foundry/openai/quotas-limits)
- [OpenAI Python SDK](https://github.com/openai/openai-python)
