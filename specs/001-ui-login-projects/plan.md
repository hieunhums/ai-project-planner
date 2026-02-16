# Implementation Plan: UI Login and Project Landing

**Branch**: `001-ui-login-projects` | **Date**: February 16, 2026 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `./spec.md`

---

## Summary

Add a demo login page with Planner/Admin personas, a project list with modal creation, and a project landing page that shows existing uploads and generated plans. Keep the current React + FastAPI stack, extend the backend data model with a Project entity, and add project-scoped API endpoints to support list views and persistent artifacts.

---

## Technical Context

**Language/Version**: Python 3.11+, TypeScript 5.3, React 18  
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic, React Router, Vite, TanStack Query

**Storage**:
- Local SQLite database (planning_assistant.db)
- Uploaded files stored locally in `backend/uploads/`

**Testing**:
- Backend: pytest
- Frontend: Vitest + React Testing Library

**Target Platform**:
- Local demo execution on macOS/Linux/Windows

**Project Type**: Web application (React frontend + FastAPI backend)

**Performance Goals**:
- UI list rendering < 200ms for project and artifact lists
- Upload processing < 30 seconds for typical spreadsheets (< 1MB)

**Constraints**:
- Local-first data only; no external persistence
- Minimal auth (persona-only, no credentials)

**Scale/Scope**:
- Single-user demo, tens of projects and plans

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No project-specific constitution defined; proceeding with standard quality gates.

**Gates to Pass**:
- ✅ Functional requirements are clear and testable
- ✅ Technical stack is specified (no NEEDS CLARIFICATION)
- ✅ Data model can be derived from spec entities
- ✅ API contracts can be defined from user stories

**Post-Phase 1 Re-check**: ✅ No additional gates introduced; design artifacts align with the spec.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-ui-login-projects/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/              # Add project endpoints, extend upload route
│   ├── models/           # Add Project model, extend Plan with project_id
│   ├── services/         # Project queries + plan list helpers
│   └── db/               # Migration or init updates for new tables
└── tests/

frontend/
├── src/
│   ├── pages/            # New LoginPage, ProjectsPage, ProjectLandingPage
│   ├── components/       # Project cards, modal, uploads/plans lists
│   ├── services/         # API client updates for projects
│   └── hooks/            # Data fetch hooks for projects and artifacts
└── tests/
```

**Structure Decision**: Web application with React frontend and FastAPI backend. The feature introduces project-aware routes and data while reusing existing upload/generate components.

---

## Complexity Tracking

No constitution violations; complexity is justified by existing architecture.

---

## Phase 0: Research & Technical Decisions

### Unknowns to Resolve

No open unknowns. The stack, storage, and routing are already defined in the repository and spec.

### Research Output

Documented in [research.md](./research.md).

---

## Phase 1: Design & Contracts

### 1.1 Data Model

Documented in [data-model.md](./data-model.md). Key additions:
- Project entity
- Plan updates: `project_id`, `source_file_name`, `base_plan_id`
- UI-facing projections for uploads and generated plans

### 1.2 API Contracts

Documented in [contracts/project-api.openapi.json](./contracts/project-api.openapi.json):
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{projectId}`
- Extend `POST /api/plans/upload` with `project_id`

### 1.3 UI Flow & Routing

- `/login`: Persona selection (Planner/Admin)
- `/projects`: Project list with modal creation
- `/projects/:projectId`: Project landing (uploads + generated plans + upload/generate actions)

### 1.4 Quickstart

Documented in [quickstart.md](./quickstart.md).

---

## Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh copilot` after Phase 1 artifacts are generated.

---

## Phase 2: Execution Tasks

*Phase 2 generation (via `/speckit.tasks`) will produce detailed execution tasks organized by:*
- **Frontend Implementation**: login page, project list modal, project landing page, project-aware state
- **Backend Implementation**: Project model + migrations, project endpoints, upload/project linking
- **Testing**: API tests for project endpoints, UI tests for routing and list rendering
- **Documentation**: Update README or in-app guidance if needed

---

## Next Steps

✅ **Phase 0**: Research documented in [research.md](./research.md)  
✅ **Phase 1**: Generate data-model.md, contracts/, quickstart.md, update agent context  
⏭ **Phase 2**: Run `/speckit.tasks` to generate detailed execution tasks
