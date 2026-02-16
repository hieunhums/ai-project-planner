# Integration Guide: Apply Agent Framework Research to AI Planning Assistant

**Purpose**: Map research artifacts to your planning project requirements (spec.md)  
**Target**: Development team implementing the AI-Augmented Planning Assistant

---

## Quick Start (TL;DR)

**For Implementation Devs**:
1. Read: [RESEARCH_SUMMARY.md](RESEARCH_SUMMARY.md) (10 min overview)
2. Copy: Code from [AGENT_FRAMEWORK_WORKING_CODE.md](AGENT_FRAMEWORK_WORKING_CODE.md) → Your `backend/src/agents/` folder
3. Adapt: Change tool functions to match your planning domain
4. Run: Follow "Usage" section in WORKING_CODE
5. Lookup: Use [AGENT_FRAMEWORK_QUICK_REF.md](AGENT_FRAMEWORK_QUICK_REF.md) when stuck

**For Architects**:
1. Read: [AGENT_FRAMEWORK_RESEARCH.md](AGENT_FRAMEWORK_RESEARCH.md) (detailed patterns & architecture)
2. Review: Section "Architecture Overview" for system design
3. Validate: Your tech stack matches recommendations
4. Document: Decisions in architecture documentation

---

## Mapping: Your Requirements → Research Solutions

### User Story 1: Upload Data & Generate AI Plan

**Requirement** (spec.md):
```
Given a planner has a spreadsheet with tasks, resources, dates, and constraints,
When they upload the file,
Then the system parses the data and the AI generates a feasible plan within reasonable time
```

**Research Solution**:

| Element | How | Where |
|---------|-----|-------|
| **Parse spreadsheet** | Tool: `parse_planning_spreadsheet()` | WORKING_CODE.md (tools.py) |
| **FastAPI upload endpoint** | POST /planning/generate-plan | WORKING_CODE.md (main.py) |
| **Generate with AI agent** | PlanningAgent.run_planning_workflow() | WORKING_CODE.md (agents.py) |
| **Stream results in real-time** | StreamingResponse + SSE | WORKING_CODE.md (main.py) |
| **Reasonable time** | gpt-5.2-reasoning (30-60s for complex plans) | RESEARCH_SUMMARY.md (Model Selection) |

**Implementation Steps**:
1. Create `backend/src/api/models.py` with Pydantic models (from WORKING_CODE.md)
2. Create `backend/src/agents/tools.py` with parsing + validation tools (customize for your domain)
3. Create `backend/src/agents/planning_agent.py` from WORKING_CODE.md (PlanningAgent class)
4. Add `/planning/generate-plan` endpoint (copy from WORKING_CODE.md)
5. Test with sample shipyard CSV (create template)

**Estimated effort**: 2-3 days

---

### User Story 2: Side-by-Side Plan Comparison

**Requirement** (spec.md):
```
Given both an original (human) plan and an AI-generated plan exist,
When displayed side-by-side,
Then differences in task sequence, dates, and resource allocation are clearly highlighted
```

**Research Solution**:

| Element | How | Where |
|---------|-----|-------|
| **Compare plans** | Tool: `compare_plans_tool()` | WORKING_CODE.md (tools.py) |
| **Comparison endpoint** | POST /planning/compare | WORKING_CODE.md (main.py) |
| **Calculate metrics** | Schedule delta, resource utilization delta | RESEARCH_SUMMARY.md (Key Metrics) |
| **Highlight trade-offs** | Tool returns structured JSON with trade_offs field | AGENT_FRAMEWORK_RESEARCH.md (Pattern 4) |

**Implementation Steps**:
1. Add `compare_plans_tool()` to tools.py (from WORKING_CODE.md)
2. Extend ComparisonResponse model with your metrics:
   - Schedule delta (original_days - ai_days)
   - Critical path change
   - Resource utilization comparison
   - Cost impact (if added to your domain)
3. Add `/planning/compare` endpoint (from WORKING_CODE.md)
4. Frontend: Build comparison table showing side-by-side metrics

**Estimated effort**: 1-2 days

---

### User Story 3: Understand AI Reasoning

**Requirement** (spec.md):
```
Given an AI plan is generated,
When a planner selects a task or decision,
Then they see an explanation of the reasoning
```

**Research Solution**:

| Element | How | Where |
|---------|-----|-------|
| **Extract reasoning** | Tool: `extract_ai_reasoning()` | WORKING_CODE.md (tools.py) |
| **Multi-turn context** | Agent Thread stores full conversation | AGENT_FRAMEWORK_RESEARCH.md (state mgmt) |
| **Structured output** | Reasoning steps as JSON array | WORKING_CODE.md (extract_ai_reasoning) |
| **Explainability audit trail** | PlanningSessionState.reasoning_chain | AGENT_FRAMEWORK_RESEARCH.md (Pattern: State Management) |

**Implementation Steps**:
1. Add `extract_ai_reasoning()` tool (from WORKING_CODE.md)
2. Enhance PlanningSessionState to capture reasoning_chain:
   ```python
   reasoning_chain = [
       {"step": "parse", "decisions": [...]},
       {"step": "validate", "violations": [...]},
       {"step": "optimize", "reasoning_steps": [...]},
   ]
   ```
3. Create `/planning/{session_id}/reasoning` endpoint to retrieve audit trail
4. Frontend: Display reasoning steps in expandable panels

**Estimated effort**: 2-3 days

---

### User Story 4: Adjust Constraints & Re-Run

**Requirement** (spec.md):
```
Given an initial plan exists,
When a planner modifies a constraint (e.g., reduces available capacity),
Then the system allows plan regeneration with new constraint
```

**Research Solution**:

| Element | How | Where |
|---------|-----|-------|
| **Accept constraint changes** | FastAPI endpoint POST /planning/{session_id}/regenerate | Not in WORKING_CODE (extend it) |
| **Store constraint versions** | Extend PlanningSessionState.artifacts | AGENT_FRAMEWORK_RESEARCH.md (State mgmt) |
| **Re-validate + regenerate** | Reuse agent workflow with updated constraints | AGENT_FRAMEWORK_RESEARCH.md (Workflow) |
| **Compare versions** | Support comparing any two plan versions | Already have compare_plans_tool |
| **Error recovery** | Circuit breaker + auto-recovery for constraint violations | AGENT_FRAMEWORK_RESEARCH.md (Error Handling) |

**Implementation Steps**:
1. Add constraint editor to frontend
2. Add POST /planning/{session_id}/regenerate endpoint:
   ```python
   @app.post("/planning/{session_id}/regenerate")
   async def regenerate_plan(session_id, new_constraints):
       state = artifact_store.load_session(session_id)
       state.artifacts["constraints"] = new_constraints
       # Re-run workflow with updated constraints
       async for chunk in agent.run_planning_workflow(...):
           yield chunk
   ```
3. Implement ArtifactStore for session persistence
4. Create plan version history view (compare any two versions)

**Estimated effort**: 3-4 days

---

### User Story 5: Accept/Reject Recommendations

**Requirement** (spec.md):
```
Given an AI plan is presented,
When a planner reviews recommendations,
Then they can select individual recommendations to accept, reject, or defer
```

**Research Solution**:

| Element | How | Where |
|---------|-----|-------|
| **Generate recommendations** | AI inherently produces recommendations; tool extracts them | AGENT_FRAMEWORK_RESEARCH.md (Tool Pattern 2) |
| **Track acceptance** | PlanningSessionState track: accepted, rejected, deferred | Extend state model |
| **Hybrid planning** | Combine accepted AI recs + planner's manual changes | Requires custom merge logic |
| **Export final plan** | Save merged plan with audit trail (which came from AI, human, hybrid) | Artifact store + comparison metadata |

**Implementation Steps**:
1. Enhance plan output to include recommendation metadata:
   ```json
   {
     "tasks": [
       {"id": "T1", "assigned_resource": "Crew1", "source": "ai", "recommendation_id": "rec_123"},
       {"id": "T2", "assigned_resource": "Crew2", "source": "human_override"},
     ]
   }
   ```
2. Add recommendation voting endpoint:
   ```python
   @app.post("/planning/{session_id}/recommendations/{rec_id}/vote")
   async def vote_recommendation(session_id, rec_id, vote: str):  # accept|reject|defer
   ```
3. Implement plan merge logic (accept subset of recommendations)
4. Export final plan with provenance (AI/human/hybrid tags)

**Estimated effort**: 3-4 days

---

## Phase-by-Phase Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

**Deliverables**:
- ✅ User Story 1: Upload & Generate Plan
- ✅ User Story 2 (partial): Basic comparison
- Tech Stack setup: FastAPI, Agent Framework, Foundry

**Tasks**:
1. Clone code from AGENT_FRAMEWORK_WORKING_CODE.md
2. Set up Foundry project & deploy gpt-5.2-reasoning
3. Create planning data CSV template (sample shipyard data)
4. Test local development setup
5. Create /planning/generate-plan endpoint with streaming
6. Create /planning/compare endpoint
7. Add @app.post /planning/generate-plan endpoint

**Resources**:
- AGENT_FRAMEWORK_WORKING_CODE.md (copy code)
- FOUNDRY_FASTAPI_INTEGRATION_GUIDE.md (auth setup)
- QUICK_REF.md (troubleshooting)

---

### Phase 2: Explainability (Week 3)

**Deliverables**:
- ✅ User Story 3: Understand Reasoning
- Audit trail & session persistence
- Constraint violation recovery

**Tasks**:
1. Add extract_ai_reasoning() tool
2. Implement ArtifactStore (JSON file or database)
3. Add /planning/{session_id}/reasoning endpoint
4. Implement PlanningSessionState properly
5. Add circuit breaker for resilience
6. Create reasoning UI panels

**Resources**:
- AGENT_FRAMEWORK_RESEARCH.md (state management, error handling)
- WORKING_CODE.md (session state pattern)

---

### Phase 3: Iteration (Week 4)

**Deliverables**:
- ✅ User Story 4: Constraint Adjustment & Regeneration
- Multi-version plan management
- What-if scenario support

**Tasks**:
1. Add constraint editor UI
2. Implement /planning/{session_id}/regenerate endpoint
3. Add version history management
4. Support comparing any two versions
5. Test with various constraint change scenarios
6. Document constraint definition format

**Resources**:
- AGENT_FRAMEWORK_RESEARCH.md (workflow patterns)
- RESEARCH_SUMMARY.md (phase recommendations)

---

### Phase 4: User Control (Week 5)

**Deliverables**:
- ✅ User Story 5: Accept/Reject Recommendations
- Hybrid planning support
- Provenance tracking (AI vs. human decisions)

**Tasks**:
1. Add recommendation voting endpoints
2. Implement plan merge logic
3. Extend models to track source (AI/human/hybrid)
4. Create recommendation UI panels
5. Export with audit metadata
6. Build provenance visualization

**Resources**:
- WORKING_CODE.md (models, tools patterns)
- RESEARCH_SUMMARY.md (metrics & formulas)

---

### Phase 5: Production Hardening (Week 6)

**Deliverables**:
- Structured logging & monitoring
- Kubernetes deployment
- Load testing & cost estimation
- Documentation for ops

**Tasks**:
1. Add structured logging (logging library)
2. Persist sessions to database (instead of files)
3. Create Kubernetes deployment manifests
4. Set up Azure App Insights monitoring
5. Cost estimation script (token count vs. cost)
6. Create runbooks (deployment, troubleshooting)
7. Security: Validate authentication, API key rotation

**Resources**:
- AGENT_FRAMEWORK_RESEARCH.md (deployment, dockerization)
- FOUNDRY_FASTAPI_INTEGRATION_GUIDE.md (auth patterns)

---

## Code Organization (Backend Structure)

```
backend/
├── src/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entry
│   ├── config.py                  # Configuration
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py              # Endpoints: /planning/*
│   │   └── models.py              # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── planning_orchestrator.py  # Multi-step workflow
│   │   ├── artifact_store.py       # Persistence layer
│   │   └── comparison_service.py    # Plan comparison logic
│   └── agents/
│       ├── __init__.py
│       ├── planning_agent.py       # PlanningAgent class (from WORKING_CODE)
│       └── tools.py                # Tool functions (customized for domain)
├── tests/
│   ├── test_tools.py              # Unit tests for tools
│   ├── test_agents.py             # Agent workflow tests
│   └── test_api.py                # Endpoint tests
├── requirements.txt               # From WORKING_CODE
├── Dockerfile                     # From AGENT_FRAMEWORK_RESEARCH
└── .env.example
```

---

## Domain Customization Key Points

Your planning domain (shipyard/port logistics) will need customization:

### 1. **Planning Data Model**
Replace generic Task/Resource with:
- Task: Add fields like `vessel_name`, `section`, `skill_requirements`
- Resource: Add `shift_availability`, `skill_certifications`
- Constraint: Add domain-specific like `facility_capacity`, `dock_availability`

### 2. **Constraint Definitions**
Customize validate_planning_constraints() for:
- Multi-facility scheduling conflict detection
- Skill matching (can resource perform task?)
- Dock/crane resource conflicts
- Environmental constraints (weather, tide)
- Crew availability patterns (shifts, holidays)

### 3. **Optimization Goals**
Enhance tool with domain-aware optimization:
- Minimize schedule (critical)
- Maximize facility utilization
- Balance workload across crews
- Minimize costly overtime
- Reduce rework/quality risks

### 4. **Reasoning Prompt**
Customize instructions in PlanningAgent for shipyard context:
- Reference domain terminology (vessel, hull, outfit phase)
- Emphasize safety constraints
- Include quality/testing considerations
- Account for sequencing dependencies (can't start outfit before hull complete)

### 5. **Comparison Metrics**
Enhance compare_plans_tool with domain metrics:
- Schedule compression (days saved)
- Cost impact (crew days, overtime)
- Facility utilization efficiency
- Risk hotspot comparison

---

## Testing Strategy

### Unit Tests (2-3 days)
```python
# test_tools.py
def test_parse_spreadsheet_valid_csv():
    content = "section,id,name,duration...\nTASK,T1,Foundation,10"
    result = parse_planning_spreadsheet(content, "csv")
    assert "tasks_count" in result
    assert json.loads(result)["tasks"][0]["id"] == "T1"

def test_validate_constraints_detects_overalloc():
    # Test constraint violation detection

# test_agents.py
async def test_planning_agent_initialization():
    agent = PlanningAgent()
    await agent.initialize()
    assert agent.agent is not None

async def test_full_workflow():
    # End-to-end planning workflow
```

### Integration Tests (1-2 days)
```python
# test_api.py
async def test_generate_plan_endpoint():
    # POST to /planning/generate-plan
    # Verify streaming response

async def test_compare_plans_endpoint():
    # POST to /planning/compare
    # Verify comparison results

async def test_workflow_with_constraint_violations():
    # Trigger auto-recovery scenario
```

### Load Testing (1 day)
```bash
# Test concurrent plan generations
k6 run load_test.js --vus 10 --duration 5m
# Estimate token usage & costs
```

---

## Troubleshooting Guide

### Issue: Agent not calling tools
**Solution**: Check that tools are passed to create_agent()
```python
agent = await client.create_agent(
    name="...",
    instructions="...",
    tools=[parse_spreadsheet, validate_constraints, ...]  # ← Ensure this
)
```

### Issue: Thread not persisting state
**Solution**: Reuse thread across steps (don't create new thread each call)
```python
thread = agent.get_new_thread()  # Create ONCE per workflow
await agent.run_stream("Step 1", thread=thread)  # Thread reused
await agent.run_stream("Step 2", thread=thread)  # Same thread
```

### Issue: Slow response or timeout
**Solution**: 
- Break large tasks into smaller tools
- Reduce max_tokens on model call
- Use gpt-5-mini for testing (cheaper, faster)

### Issue: Credential errors
**Solution**: Verify authentication setup
```bash
az login
az account show
python -c "from azure.identity import DefaultAzureCredential; DefaultAzureCredential().get_token('https://cognitiveservices.azure.com/.default')"
```

---

## Next Immediate Actions

**For Technical Lead**:
1. [ ] Schedule 2-hour architecture review with team
2. [ ] Create Foundry project + deploy gpt-5.2-reasoning
3. [ ] Assign Phase 1-2 work (divide into 2 developer tracks)
4. [ ] Create private GitHub repo with WORKING_CODE.md as starter template

**For Developers**:
1. [ ] Read RESEARCH_SUMMARY.md (20 min)
2. [ ] Clone WORKING_CODE.md files → Your backend/src structure
3. [ ] Create sample planning CSV based on your domain
4. [ ] Get local development running (Week 1)
5. [ ] Extend tools for your domain specifics (Week 2)

**For DevOps**:
1. [ ] Prepare Azure Foundry project resources
2. [ ] Review DOCKER setup from AGENT_FRAMEWORK_RESEARCH.md
3. [ ] Plan Kubernetes deployment (Week 5-6)
4. [ ] Set up monitoring (App Insights, Log Analytics)

---

## Files Reference

| File | Best For | Time |
|------|----------|------|
| [RESEARCH_SUMMARY.md](RESEARCH_SUMMARY.md) | Strategy & overview | 15 min |
| [AGENT_FRAMEWORK_RESEARCH.md](AGENT_FRAMEWORK_RESEARCH.md) | Architecture & patterns | 45 min |
| [AGENT_FRAMEWORK_QUICK_REF.md](AGENT_FRAMEWORK_QUICK_REF.md) | Implementation lookups | 5 min (per lookup) |
| [AGENT_FRAMEWORK_WORKING_CODE.md](AGENT_FRAMEWORK_WORKING_CODE.md) | Copy-paste code | 10 min to copy, 1 day to adapt |
| [FOUNDRY_FASTAPI_INTEGRATION_GUIDE.md](FOUNDRY_FASTAPI_INTEGRATION_GUIDE.md) | Auth & Foundry setup | 20 min |

---

## Success Metrics

**Week 1 End**:
- Basic planning agent running locally
- Upload endpoint working with sample data
- Streaming response working

**Week 2 End**:
- All 5 user stories implemented (MVP)
- Artifact persistence working
- Domain customizations for shipyard context

**Week 6 End**:
- Production-ready deployment
- Monitoring & alerting configured
- Documentation complete
- Ready for stakeholder review

---

**Document**: Integration Guide  
**Target Audience**: Development Team  
**Last Updated**: February 16, 2026  
**Status**: Ready to Execute
