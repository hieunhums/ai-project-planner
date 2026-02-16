---

description: "Task list for AI-Augmented Planning Assistant for Shipyard & Port Logistics"
---

# Tasks: AI-Augmented Planning Assistant for Shipyard & Port Logistics

**Input**: Design documents from `/specs/001-ai-planning-assistant/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Not requested in the feature specification; no explicit test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 0: Research & Technical Decisions (Optional)

**Purpose**: Resolve technical unknowns identified in plan.md Phase 0

- [X] T000 [P] Research Azure OpenAI integration patterns via Azure AI Foundry (SDK, latency, best practices) and document in specs/001-ai-planning-assistant/research.md
- [X] T001 [P] Research Microsoft Agent Framework orchestration patterns for multi-step planning workflows in specs/001-ai-planning-assistant/research.md
- [X] T002 [P] Research schema inference strategies for flexible spreadsheet parsing in specs/001-ai-planning-assistant/research.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T003 Create project structure per implementation plan in backend/, frontend/, docker/, infra/
- [X] T004 Initialize backend project scaffold in backend/pyproject.toml, backend/requirements.txt, backend/src/main.py
- [X] T005 Initialize frontend Vite React TS scaffold in frontend/package.json, frontend/src/main.tsx, frontend/src/App.tsx
- [X] T006 [P] Add backend environment template in backend/.env.example
- [X] T007 [P] Add frontend environment template in frontend/.env.example
- [X] T008 [P] Add local container assets in docker/Dockerfile.backend, docker/Dockerfile.frontend, docker/docker-compose.yml
- [X] T009 [P] Generate sample planning data CSV files in backend/tests/fixtures/sample_plans/ mimicking user-generated Excel format per data model requirements

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T010 Add backend configuration loader and settings in backend/src/config.py
- [X] T011 Create FastAPI app bootstrap and router wiring in backend/src/main.py, backend/src/api/routes.py
- [X] T012 Implement base API request/response models in backend/src/api/models.py
- [X] T013 Define SQLAlchemy base and DB session handling in backend/src/models/database.py, backend/src/db/__init__.py
- [X] T014 Create core Pydantic schemas with plan_lineage field (AI/human/hybrid tracking) in backend/src/models/schemas.py
- [X] T015 Implement local file and DB storage utilities with lineage metadata persistence in backend/src/services/storage_service.py
- [X] T016 [P] Wire logging and error handling middleware in backend/src/main.py
- [X] T017 [P] Add frontend API client and shared types in frontend/src/services/api.ts, frontend/src/services/types.ts
- [X] T018 [P] Add React Query provider and basic route layout in frontend/src/main.tsx, frontend/src/Layout.tsx
- [X] T019 [P] Generate data model documentation in specs/001-ai-planning-assistant/data-model.md with entity schemas
- [X] T020 [P] Generate API contracts (OpenAPI spec) in specs/001-ai-planning-assistant/contracts/planning-api.openapi.json

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Upload Planning Data and Generate Initial AI Plan (Priority: P1) 

**Goal**: Enable planners to upload spreadsheets and generate an initial AI plan with schedule, capacity, and resource allocations.

**Independent Test**: Upload a sample CSV/XLSX file, generate a plan, and see a plan summary with tasks, dates, resources, and capacity metrics.

### Implementation for User Story 1

- [X] T021 [P] [US1] Add spreadsheet parsing dependencies (pandas, openpyxl) in backend/requirements.txt
- [X] T022 [P] [US1] Implement spreadsheet parser with unsupported format error handling (Edge Case A1) in backend/src/services/planning_service.py
- [X] T023 [P] [US1] Implement Azure OpenAI client wrapper via Azure AI Foundry SDK in backend/src/services/ai_service.py
- [X] T024 [P] [US1] Define agent tools (parse, validate, optimize) in backend/src/agents/tools.py
- [X] T025 [US1] Implement Microsoft Agent Framework orchestration calling Azure OpenAI reasoning models in backend/src/agents/planning_agent.py
- [X] T026 [US1] Implement plan generation flow orchestrating agent framework (calls T025 for AI reasoning) with infeasibility fallback handling (Edge Case A2) in backend/src/services/planning_service.py
- [X] T027 [US1] Implement constraint relaxation suggestion logic for infeasible plans (FR-014) in backend/src/services/planning_service.py
- [X] T028 [US1] Add upload and generate endpoints in backend/src/api/routes.py
- [X] T029 [P] [US1] Build upload form component in frontend/src/components/FileUpload.tsx
- [X] T030 [P] [US1] Add plan generation hook in frontend/src/hooks/usePlanGeneration.ts
- [X] T031 [US1] Build initial plan view in frontend/src/pages/HomePage.tsx, frontend/src/components/PlanDetails.tsx

**Checkpoint**: User Story 1 fully functional and independently demoable

---

## Phase 4: User Story 2 - View Side-by-Side Comparison (Priority: P1)

**Goal**: Display AI plan vs human plan with differences, trade-offs, and improvement metrics.

**Independent Test**: Generate an AI plan and compare it with the uploaded plan; differences and trade-offs are highlighted side-by-side.

### Implementation for User Story 2

- [X] T032 [P] [US2] Implement plan comparison logic in backend/src/services/comparison_service.py
- [X] T033 [US2] Add comparison endpoint in backend/src/api/routes.py
- [X] T034 [P] [US2] Build comparison view component in frontend/src/components/PlanComparison.tsx
- [X] T035 [US2] Build comparison page in frontend/src/pages/ComparePage.tsx
- [X] T036 [US2] Add comparison hook in frontend/src/hooks/usePlanComparison.ts

**Checkpoint**: User Story 2 independently demonstrates side-by-side differences and trade-offs

---

## Phase 5: User Story 3 - Understand AI Reasoning and Assumptions (Priority: P1)

**Goal**: Expose AI explanations and assumptions behind plan decisions.

**Independent Test**: Select a task in the AI plan and view explanation, assumptions, and trade-off reasoning.

### Implementation for User Story 3

- [X] T037 [P] [US3] Add explanation and assumption fields to schemas in backend/src/models/schemas.py
- [X] T038 [US3] Persist explanations in plan generation flow in backend/src/services/planning_service.py
- [X] T039 [US3] Add plan details endpoint for explanations in backend/src/api/routes.py
- [X] T040 [P] [US3] Enhance plan details UI in frontend/src/components/PlanDetails.tsx
- [X] T041 [US3] Add plan detail fetcher to frontend/src/services/api.ts

**Checkpoint**: User Story 3 independently shows AI reasoning and assumptions

---

## Phase 6: User Story 4 - Adjust Constraints and Re-Run AI Plan (Priority: P2)

**Goal**: Allow planners to modify constraints or assumptions and regenerate plans.

**Independent Test**: Update a constraint (e.g., capacity), re-run AI, and see updated plan and comparison.

### Implementation for User Story 4

- [X] T042 [P] [US4] Add constraint update schemas in backend/src/models/schemas.py
- [X] T043 [US4] Implement constraint update and plan versioning in backend/src/services/planning_service.py
- [X] T044 [US4] Add constraints endpoint in backend/src/api/routes.py
- [X] T045 [P] [US4] Build constraint editor component in frontend/src/components/ConstraintEditor.tsx
- [X] T046 [US4] Build iteration page in frontend/src/pages/IteratePage.tsx

**Checkpoint**: User Story 4 independently supports what-if iteration

---

## Phase 7: User Story 5 - Accept, Reject, or Modify AI Recommendations (Priority: P2)

**Goal**: Enable human-in-the-loop recommendation controls and exportable final plans.

**Independent Test**: Accept or reject AI recommendations, generate a final hybrid plan, and export it.

### Implementation for User Story 5

- [X] T047 [P] [US5] Add recommendation decision schemas in backend/src/models/schemas.py
- [X] T048 [US5] Implement recommendation update logic in backend/src/services/planning_service.py
- [X] T049 [US5] Add recommendation endpoints in backend/src/api/routes.py
- [X] T050 [P] [US5] Build recommendation panel component in frontend/src/components/RecommendationPanel.tsx
- [X] T051 [P] [US5] Build export panel component in frontend/src/components/ExportPanel.tsx
- [X] T052 [US5] Implement export endpoint and file generation in backend/src/api/routes.py

**Checkpoint**: User Story 5 independently supports recommendation control and export

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and deployment readiness

- [X] T053 [P] Add local demo guide in specs/001-ai-planning-assistant/quickstart.md
- [X] T054 [P] Add Azure container deployment templates in infra/bicep/main.bicep, infra/bicep/container-instances.bicep
- [X] T055 [P] Add Azure deployment helper script in infra/azure-deployment.sh
- [X] T056 [P] Add local-first setup guidance in README.md
- [X] T057 Performance pass on plan comparison rendering in frontend/src/components/PlanComparison.tsx
- [X] T058 [P] Implement DELETE endpoint for projects in backend/src/api/routes.py to handle project deletion with cascade cleanup
- [X] T059 [P] Add deleteProject() API client method in frontend/src/services/api.ts
- [X] T060 Update ProjectCard component with delete (trash) icon button in frontend/src/components/ProjectCard.tsx
- [X] T061 Implement delete handler with confirmation dialog and error handling in frontend/src/components/ProjectCard.tsx

---

## Dependencies & Execution Order

### Phase Dependencies

- **Research (Phase 0)**: Optional - can run in parallel with Setup or before Setup
- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational phase only
- **User Story 2 (P1)**: Depends on Foundational phase only
- **User Story 3 (P1)**: Depends on Foundational phase only
- **User Story 4 (P2)**: Depends on Foundational phase only
- **User Story 5 (P2)**: Depends on Foundational phase only

### Parallel Execution Examples

**Phase 0 (Research)**:
- All tasks (T000, T001, T002) can run in parallel

**User Story 1**:
- Parallel: T021, T022, T023, T024, T029, T030
- Then: T025, T026, T027 (orchestration and plan generation)
- Finally: T028, T031

**User Story 2**:
- Parallel: T032, T034, T036
- Then: T033, T035

**User Story 3**:
- Parallel: T037, T040
- Then: T038, T039, T041

**User Story 4**:
- Parallel: T042, T045
- Then: T043, T044, T046

**User Story 5**:
- Parallel: T047, T050, T051
- Then: T048, T049, T052

---

## Implementation Strategy

- **MVP First**: Deliver User Stories 1-3 to ensure core upload, generation, comparison, and explainability are demo-ready.
- **Iterative Enhancement**: Add User Stories 4-5 for what-if analysis and recommendation control after MVP validation.
- **Local-First Delivery**: Ensure local demo flow works end-to-end before optional Azure deployment tasks.
- **Explainability Emphasis**: Prioritize surfacing AI reasoning and assumptions across all relevant UI surfaces.
