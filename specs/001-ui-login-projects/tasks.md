# Tasks: UI Login and Project Landing

**Input**: Design documents from `/specs/001-ui-login-projects/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are optional and not included because the specification does not request TDD.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lightweight scaffolding shared by all user stories

- [x] T001 Create shared route and session helpers in frontend/src/routes.ts and frontend/src/services/session.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story work

- [x] T002 Update routing shell and layout gating in frontend/src/App.tsx and frontend/src/Layout.tsx
- [x] T003 Add project and summary types in frontend/src/services/types.ts
- [x] T004 Add project list/create/detail API methods in frontend/src/services/api.ts
- [x] T005 Extend database models with Project and Plan fields in backend/src/models/database.py
- [x] T006 Extend Pydantic schemas for Project and Plan metadata in backend/src/models/schemas.py
- [x] T007 Update DB initialization for Project table and new Plan columns in backend/src/db/__init__.py
- [x] T008 [P] Add project data access helper in backend/src/services/project_service.py
- [x] T009 Update API routes for projects and upload project_id in backend/src/api/routes.py

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Persona Login Entry (Priority: P1) 🎯 MVP

**Goal**: Provide a persona login page that routes to the project list

**Independent Test**: Select Planner or Admin and confirm navigation to the project list page

### Implementation

- [x] T010 [US1] Build login page UI with persona choices in frontend/src/pages/LoginPage.tsx
- [x] T011 [P] [US1] Add login page styles in frontend/src/pages/LoginPage.css
- [x] T012 [US1] Persist selected persona and redirect to projects in frontend/src/services/session.ts and frontend/src/pages/LoginPage.tsx

**Checkpoint**: User Story 1 fully functional and testable

---

## Phase 4: User Story 2 - View and Create Projects (Priority: P2)

**Goal**: Display existing projects and allow creation via a modal

**Independent Test**: See a project list and create a new project that appears immediately

### Implementation

- [x] T013 [P] [US2] Create project card component in frontend/src/components/ProjectCard.tsx
- [x] T014 [P] [US2] Add project card styles in frontend/src/components/ProjectCard.css
- [x] T015 [P] [US2] Create project creation modal in frontend/src/components/ProjectCreateModal.tsx
- [x] T016 [P] [US2] Add modal styles in frontend/src/components/ProjectCreateModal.css
- [x] T017 [US2] Implement project list page layout in frontend/src/pages/ProjectsPage.tsx
- [x] T018 [US2] Add plus-sign button that opens the create modal in frontend/src/pages/ProjectsPage.tsx
- [x] T019 [P] [US2] Add project list page styles in frontend/src/pages/ProjectsPage.css
- [x] T020 [US2] Wire list/create APIs and navigation in frontend/src/pages/ProjectsPage.tsx
- [x] T021 [US2] Add project list hooks in frontend/src/hooks/useProjects.ts
- [x] T022 [US2] Enforce project name validation in frontend/src/components/ProjectCreateModal.tsx
- [x] T023 [US2] Enforce server-side project name validation in backend/src/api/routes.py and backend/src/services/project_service.py

**Checkpoint**: User Stories 1 and 2 independently functional

---

## Phase 5: User Story 3 - Project Landing 3-Step Workflow (Priority: P3)

**Goal**: Implement the 3-step workflow (upload current plan → upload new project details → generate AI plan) on the project landing page, with step gating and a redirect to the Gantt visualisation on success. Show existing uploads and generated plans below the workflow steps.

**Independent Test**: Complete each step in sequence; verify step states (active/done/locked) update correctly and that plan generation redirects to the Gantt page.

### Implementation

- [x] T024 [US3] Implement project landing layout with 3-step workflow in frontend/src/pages/ProjectLandingPage.tsx
- [x] T025 [P] [US3] Add project landing styles in frontend/src/pages/ProjectLandingPage.css
- [x] T026 [P] [US3] Create uploads list component in frontend/src/components/ProjectUploadsList.tsx
- [x] T027 [P] [US3] Add uploads list styles in frontend/src/components/ProjectUploadsList.css
- [x] T028 [P] [US3] Create generated plans list component in frontend/src/components/ProjectGeneratedPlansList.tsx
- [x] T029 [P] [US3] Add generated plans list styles in frontend/src/components/ProjectGeneratedPlansList.css
- [x] T030 [US3] Add project detail hook in frontend/src/hooks/useProjectDetail.ts
- [x] T031 [US3] Update upload flow to send project_id and source filename in frontend/src/components/FileUpload.tsx
- [x] T032 [US3] Return upload/plan metadata in backend/src/api/routes.py and backend/src/services/project_service.py
- [x] T033 [US3] Render upload/plan metadata in frontend/src/components/ProjectUploadsList.tsx and frontend/src/components/ProjectGeneratedPlansList.tsx
- [x] T034 [US3] Ensure landing page retains existing uploads/plans and hides empty sections in frontend/src/pages/ProjectLandingPage.tsx
- [x] T034a [US3] Implement Step 2 client-side mock (no backend) for new project details CSV upload in frontend/src/pages/ProjectLandingPage.tsx
- [x] T034b [US3] Implement step gating logic (Steps 2 and 3 locked until prior step completes) in frontend/src/pages/ProjectLandingPage.tsx
- [x] T034c [US3] Add progress bar and AI reasoning status indicator for Step 3 generation in frontend/src/pages/ProjectLandingPage.tsx
- [x] T034d [US3] Navigate to Gantt page on successful plan generation in frontend/src/pages/ProjectLandingPage.tsx
- [x] T034e [US3] Add plan generation hook in frontend/src/hooks/usePlanGeneration.ts

**Checkpoint**: All user stories independently functional

---

## Phase 6: Gantt Visualisation & Project Deletion (User Stories 4 & new)

**Purpose**: Gantt page after plan generation and project card deletion

- [x] T035 [P] [US4] Add `/projects/:projectId/gantt` route to frontend/src/routes.ts and frontend/src/App.tsx
- [x] T036 [P] [US4] Build Gantt page layout with plan badges in frontend/src/pages/GanttPage.tsx and frontend/src/pages/GanttPage.css
- [x] T037 [P] [US4] Build static Gantt chart component rendering human and AI entries in frontend/src/components/GanttChart.tsx and frontend/src/components/GanttChart.css
- [x] T038 [P] Add ConfirmDialog reusable component in frontend/src/components/ConfirmDialog.tsx and frontend/src/components/ConfirmDialog.css
- [x] T039 Add project deletion with trash icon, confirm dialog, and error handling in frontend/src/components/ProjectCard.tsx
- [x] T040 Add backend DELETE /projects/:id endpoint with cascade cleanup in backend/src/api/routes.py and backend/src/services/project_service.py
- [x] T041 Add deleteProject() API client method in frontend/src/services/api.ts
- [x] T042 [P] Validate quickstart flow steps in specs/001-ui-login-projects/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational - no dependencies on other stories
- **User Story 2 (P2)**: Starts after Foundational - independent of US1 logic
- **User Story 3 (P3)**: Starts after Foundational - depends on project detail data

### Parallel Execution Examples

**User Story 1**

- T010 Build login page UI in frontend/src/pages/LoginPage.tsx
- T011 Add login page styles in frontend/src/pages/LoginPage.css

**User Story 2**

- T013 Create project card component in frontend/src/components/ProjectCard.tsx
- T015 Create project creation modal in frontend/src/components/ProjectCreateModal.tsx

**User Story 3**

- T026 Create uploads list component in frontend/src/components/ProjectUploadsList.tsx
- T028 Create generated plans list component in frontend/src/components/ProjectGeneratedPlansList.tsx

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate login-to-projects routing

### Incremental Delivery

1. Setup + Foundational
2. User Story 1 → Validate
3. User Story 2 → Validate
4. User Story 3 → Validate
5. Polish tasks
