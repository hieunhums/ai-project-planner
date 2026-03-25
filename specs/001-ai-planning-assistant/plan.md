# Implementation Plan: AI-Augmented Planning Assistant for Shipyard & Port Logistics

**Branch**: `001-ai-planning-assistant` | **Date**: February 16, 2026 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `./spec.md`

---

## Summary

Develop a web-based planning assistant that leverages AI reasoning models (GPT-5.2-reasoning or Claude-Opus-4.5) to generate optimized shipyard/port logistics plans. The system accepts planning data uploads, generates AI-proposed plans using Azure AI Foundry with Microsoft Agent Framework orchestration, displays side-by-side comparisons with human plans, and enables iterative what-if scenario exploration. The demo prioritizes local execution with optional Azure deployment; all uploaded data remains locally available; explainability is core—the AI's reasoning process drives transparent decision-support.

---

## Technical Context

**Language/Version**: 
- Backend: Python 3.11+
- Frontend: TypeScript + React 18+

**Primary Dependencies**:
- Backend: FastAPI, Azure AI Foundry SDK (Azure OpenAI), Microsoft Agent Framework, SQLAlchemy, Pydantic
- Frontend: React, TypeScript, Vite, TanStack Query, Recharts (for visualizations)

**Storage**: 
- Local persistent SQLite database (single-file, local-only)
- Uploaded spreadsheets stored locally as files (local filesystem)

**Testing**: 
- Backend: pytest (unit, integration)
- Frontend: Vitest + React Testing Library

**Target Platform**: 
- Local: macOS/Linux/Windows (laptop execution)
- Optional deployment: Azure Container Instances (separate frontend/backend containers)

**Project Type**: Web application (React frontend + Python FastAPI backend)

**Performance Goals**: 
- Plan generation: 3-5 minutes for 10–50 task plans (accounting for Azure OpenAI reasoning model latency)
- UI responsiveness: < 200ms for plan comparison rendering
- Data upload: < 30 seconds for typical spreadsheets (< 1MB)

**Constraints**: 
- Local database: < 100MB storage (sufficient for MVP)
- Model inference: Depends on Azure OpenAI endpoint response time via Azure AI Foundry (typically 2-4 minutes for reasoning models with extended thinking time)
- Concurrent users: Single user (local demo); no multi-user infrastructure needed for MVP

**Scale/Scope**: 
- Single-project planning (10–50 tasks per demo)
- Single user session (local deployment)
- Spreadsheet formats: CSV, Excel (.xlsx)

---

## Constitution Check

*No project-specific constitution defined; proceeding with standard quality gates.*

**Gates to Pass**:
- ✅ All functional requirements are clear and testable
- ✅ Technical stack is specified (no NEEDS CLARIFICATION in FR)
- ✅ Data model can be derived from spec entities
- ✅ API contracts can be defined from user stories

---

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-planning-assistant/
├── spec.md                    # Feature specification
├── plan.md                    # This file (implementation plan)
├── research.md                # Phase 0 output (research findings)
├── data-model.md              # Phase 1 output (data entities & schema)
├── quickstart.md              # Phase 1 output (setup & local demo guide)
├── contracts/                 # Phase 1 output (API definitions)
│   ├── planning-api.openapi.json
│   ├── data-schema.json
│   └── agent-tools.json
└── tasks.md                   # Phase 2 output (execution tasks, created by /speckit.tasks)
```

### Source Code (repository root)

```text
ai-project-planner/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes.py          # Main API endpoints
│   │   │   └── models.py          # Request/response Pydantic models
│   │   ├── services/
│   │   │   ├── planning_service.py # Plan generation orchestration
│   │   │   ├── ai_service.py       # Azure AI Foundry integration
│   │   │   ├── comparison_service.py # Plan comparison logic
│   │   │   └── storage_service.py  # File & DB operations
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── planning_agent.py   # Microsoft Agent Framework wrapper
│   │   │   └── tools.py            # Agent tools (constraint validation, optimization, etc.)
│   │   ├── models/
│   │   │   ├── database.py         # SQLAlchemy models
│   │   │   └── schemas.py          # Pydantic schemas
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   └── init_db.py          # DB initialization, migrations
│   │   └── main.py                 # FastAPI app entry point
│   ├── tests/
│   │   ├── unit/                   # Unit tests for services
│   │   ├── integration/            # Integration tests (API, agents)
│   │   └── fixtures/               # Test data, mocks
│   ├── requirements.txt            # Python dependencies
│   ├── pyproject.toml              # Project config
│   └── .env.example                # Environment template (API keys, endpoints)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.tsx      # Spreadsheet upload form
│   │   │   ├── PlanComparison.tsx  # Side-by-side plan view
│   │   │   ├── PlanDetails.tsx     # Plan details, explanations, assumptions
│   │   │   ├── ConstraintEditor.tsx # Constraint modification UI
│   │   │   ├── RecommendationPanel.tsx # Accept/reject recommendations
│   │   │   ├── ExportPanel.tsx     # Export plan as Gantt, CSV, etc.
│   │   └── Layout.tsx              # Main layout wrapper
│   ├── pages/
│   │   ├── HomePage.tsx            # Entry screen (upload + initial plan)
│   │   ├── ComparePage.tsx         # Comparison & analysis view
│   │   └── IteratePage.tsx         # What-if scenario iteration
│   ├── services/
│   │   ├── api.ts                  # API client (TanStack Query)
│   │   └── types.ts                # TypeScript interfaces
│   ├── hooks/
│   │   ├── usePlanGeneration.ts    # Plan generation state management
│   │   └── usePlanComparison.ts    # Comparison state management
│   ├── App.tsx                     # Main app component
│   ├── main.tsx                    # Vite entry point
│   └── index.css                   # Global styles
│   ├── tests/
│   │   ├── unit/                   # Component unit tests
│   │   └── integration/            # Page/flow integration tests
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docker/
│   ├── Dockerfile.backend          # Backend Ubuntu image + Python runtime
│   ├── Dockerfile.frontend         # Frontend Node/npm build → static serve
│   └── docker-compose.yml          # Local multi-container orchestration
│
├── infra/
│   ├── bicep/
│   │   ├── main.bicep              # Root infrastructure template
│   │   ├── container-registry.bicep
│   │   ├── container-instances.bicep (frontend & backend)
│   │   └── storage.bicep           (optional: blob storage for logs/data backup)
│   └── azure-deployment.sh         # Deployment helper script
│
├── .github/workflows/
│   └── ci-cd.yml                   # Optional: GitHub Actions for Azure deployment
│
└── README.md                        # Setup & run instructions
```

**Structure Decision**: Web application with decoupled frontend (React/TypeScript) and backend (Python/FastAPI). Separate directories enable independent development, testing, and containerization. Local-first with optional Azure Container Instances deployment.

---

## Complexity Tracking

No constitution violations; complexity is justified:

| Aspect | Justification |
|--------|---------------|
| Separate frontend/backend | Required for scaling demo (frontend can run on laptop, backend can be deployed to Azure independently) |
| Azure AI Foundry integration | Necessary to access GPT-5.2-reasoning or Claude-Opus-4.5; local model inference not feasible for reasoning models at this capability level |
| Local SQLite DB | Sufficient for MVP (single-session state); avoids SaaS dependencies for local demo |
| Microsoft Agent Framework | Needed to orchestrate AI agents and their tools (constraint validation, plan generation, comparison); native Python support aligns with FastAPI backend |

---

## Phase 0: Research & Technical Decisions

### Unknowns to Resolve

Based on the specification and tech stack selections, the following areas require research:

1. **Azure OpenAI Integration Pattern**: How to efficiently call GPT-4 Turbo with extended thinking (or o1 reasoning models) via Azure OpenAI through Azure AI Foundry? What are SDK best practices? Latency expectations?
2. **Microsoft Agent Framework for Plan Optimization**: How to structure agents and tools within the Agent Framework for multi-step planning (data parsing, constraint validation, optimization, explanation generation)?
3. **Schema & Data Parsing**: What's the best approach to infer planning data structure from arbitrary Excel/CSV uploads? Should we enforce a fixed schema or support flexible input detection?
4. **Local SQLite Persistence**: Best practices for SQLite in FastAPI (session management, migrations, concurrency)?
5. **Plan Comparison Algorithm**: How to algorithmically detect and quantify differences between two plans at scale (10–50 tasks)?
6. **Explainability Extraction**: How to capture and surface the AI model's reasoning process in the UI without overwhelming users?

### Research Phase Execution

*[Phase 0 will dispatch research agents for each unknown; findings consolidated in research.md]*

**Expected Research Output**:
- Azure AI Foundry integration patterns (SDK examples, latency measurements)
- Agent Framework orchestration patterns for planning workflows
- Data schema inference strategies for spreadsheet uploads
- SQLite + FastAPI best practices
- Plan difference detection algorithm (graph-based vs set-based comparison)
- Explainability UI patterns (progressive disclosure, accordion sections)

---

## Phase 1: Design & Contracts

### 1.1 Data Model

*[Phase 1 will generate data-model.md with complete entity definitions]*

Entities from spec:
- **Task**: task ID, name, duration, dates, resource requirements, dependencies, constraints, priority
- **Resource**: resource ID, type, capacity, availability, cost, allocation status
- **Plan**: plan ID, timestamp, task sequence, resource allocations, duration, capacity utilization
- **Constraint**: type, scope, priority level
- **Assumption**: assumption metadata (priority weighting, risk tolerance, etc.)
- **Recommendation**: recommendation ID, type, affected entities, rationale, impact metrics

Database Schema (SQLite):
- `tasks` table (with foreign keys to `plans`)
- `resources` table
- `plans` table (with original_plan_data JSON column for versioning)
- `constraints` table
- `assumptions` table
- `recommendations` table
- `plan_versions` table (for iteration history)

### 1.2 API Contracts

*[Phase 1 will generate contracts/ directory with OpenAPI/JSON schema definitions]*

Key endpoints:
- `POST /api/plans/upload` → Accept CSV/Excel, parse, store
- `POST /api/plans/{id}/generate` → Trigger AI plan generation
- `GET /api/plans/{id}` → Fetch single plan with all details
- `POST /api/plans/{id}/compare` → Fetch comparison (original vs AI)
- `POST /api/plans/{id}/constraints` → Modify constraints, trigger regeneration
- `POST /api/plans/{id}/accept-recommendation` → Track user decisions
- `GET /api/plans/{id}/export` → Export plan (Gantt, CSV)

### 1.3 Agent Tools & Orchestration

*[Phase 1 will define tools for Microsoft Agent Framework]*

Agent tools:
- `parse_spreadsheet_tool`: Parse uploaded file into Task/Resource/Constraint objects
- `validate_constraints_tool`: Check constraint feasibility
- `generate_plan_tool`: Call AI reasoning model with structured planning prompt
- `extract_reasoning_tool`: Capture and structure AI model's reasoning process
- `compare_plans_tool`: Compute differences and trade-offs
- `suggest_improvements_tool`: Identify optimization opportunities

### 1.4 Quick Start Guide

*[Phase 1 will generate quickstart.md with setup and demo instructions]*

---

## Agent Context Update

*Phase 1 will run `.specify/scripts/bash/update-agent-context.sh copilot` to register this plan with the AI agent system.*

---

## Phase 2: Execution Tasks

*Phase 2 generation (via `/speckit.tasks`) will produce detailed execution tasks organized by:*
- **Frontend Implementation**: Components, state management, API integration
- **Backend Implementation**: Services, AI integration, database operations
- **Testing**: Unit, integration, end-to-end tests
- **Infrastructure**: Docker images, Azure deployment
- **Documentation**: API docs, deployment guides

---

## Next Steps

✅ **Phase 0**: Execute research for the 6 identified unknowns  
✅ **Phase 1**: Generate data-model.md, contracts/, quickstart.md, update agent context  
⏭ **Phase 2**: Run `/speckit.tasks` to generate detailed execution tasks

---

## Notes

- **Local-First Priority**: All demo execution happens on the laptop; Azure deployment is optional for production/showcase purposes
- **Data Privacy**: Uploaded planning files remain local; no cloud storage of user data required for MVP
- **Model Costs**: Azure AI Foundry usage will incur API call costs; budget for reasoning model inference during development and demo
- **Offline Capability**: Backend can function offline for plan comparisons and iterations; only AI generation requires Azure connectivity
