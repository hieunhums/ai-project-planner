# Implementation Plan: Enquiry to Proposal

**Branch**: `002-enquiry-to-proposal` | **Date**: February 27, 2026 | **Spec**: [spec.md](./spec.md)

## Summary

Replace the 3-step upload-and-generate project landing workflow with a four-phase end-to-end planning journey: (1) project details form + dual file uploads, (2) simulated yard availability check, (3) simulated capacity assessment producing an augmented plan table + rationale, (4) interactive Gantt chart with NL editing, drag-and-drop editing, single-step undo, and chart/data download. All simulation is handled by FastAPI stub endpoints with an artificial 10–20 s delay. NL command parsing is handled by a server-side rule-based FastAPI endpoint.

## Technical Context

**Language/Version**: Python 3.11 (backend) · TypeScript / React 18 (frontend)
**Primary Dependencies**: FastAPI · SQLAlchemy 2 · Pydantic v2 · React Router DOM · Vite
**Storage**: SQLite (dev) via existing SQLAlchemy ORM; files stored in `backend/uploads/`
**Testing**: pytest (backend) · existing test suite in `backend/tests/`
**Target Platform**: Local dev server (FastAPI on port 8000, Vite on port 5173)
**Project Type**: Web application — `backend/` + `frontend/`
**Performance Goals**: Stub endpoints respond within 25 s (intentional delay); NL parse round-trip < 2 s; drag-drop re-render < 1 s
**Constraints**: No new third-party frontend libraries unless already in `package.json`; no LLM calls in this sprint
**Scale/Scope**: Single-user demo; plans up to ~50 rows

## Constitution Check

Constitution file is a blank template — no project-specific gates defined. Applying general engineering principles:

| Gate | Status | Notes |
|------|--------|-------|
| No unnecessary new services or projects | PASS | All changes live inside existing `backend/` and `frontend/` trees |
| DB changes are additive (no destructive migrations for existing data) | PASS | `Project` table gains nullable columns only; no existing columns removed |
| Simulated endpoints are clearly labelled in code | PASS | Stub routes tagged with `# STUB` comment in `routes.py`; semantically nested under `/api/projects/{id}/` (resource-scoped, not a separate simulate prefix — the STUB comment is the marker) |
| Frontend state does not leak between projects | PASS | Session state keyed by `projectId` |

## Project Structure

### Documentation (this feature)

> **Note**: `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` below are speckit template scaffolding placeholders. They are **not sprint deliverables** and do not require implementation tasks. Only `plan.md`, `spec.md`, and the checklists are required outputs.

```text
specs/002-enquiry-to-proposal/
├── plan.md          ← this file
├── spec.md
├── research.md      ← created below (Phase 0)
├── data-model.md    ← created below (Phase 1)
├── contracts/       ← created below (Phase 1)
│   ├── yard-availability.yaml
│   ├── capacity-plan.yaml
│   └── plan-edit-parse.yaml
├── quickstart.md    ← created below (Phase 1)
└── checklists/
    └── requirements.md
```

### Source Code

```text
backend/
├── src/
│   ├── models/
│   │   ├── database.py          MODIFY — add new columns to Project; add ProjectType enum
│   │   └── schemas.py           MODIFY — add new Pydantic schemas for all new request/response types
│   ├── api/
│   │   └── routes.py            MODIFY — add 5 new route groups (details, availability, capacity, plan-edit, plan-update)
│   ├── services/
│   │   ├── project_service.py   MODIFY — extend save/update project with new fields
│   │   └── simulation_service.py  NEW — yard availability + capacity plan stub logic with asyncio.sleep delay
│   │   └── nl_parse_service.py    NEW — regex rule-based NL command parser
│   └── db/
│       └── migrations/          NEW — Alembic migration adding new Project columns
└── tests/
    └── test_002_enquiry_proposal.py   NEW — pytest tests for new endpoints

frontend/
├── src/
│   ├── pages/
│   │   ├── ProjectLandingPage.tsx    REPLACE — full rewrite to 4-phase workflow
│   │   ├── ProjectLandingPage.css    REPLACE
│   │   ├── GanttPage.tsx             MODIFY — add NL input, undo button, download buttons; pass live plan data
│   │   └── GanttPage.css             MODIFY
│   ├── components/
│   │   ├── ProjectDetailsForm.tsx    NEW — project data + planning preferences form
│   │   ├── ProjectDetailsForm.css    NEW
│   │   ├── YardAvailabilityTable.tsx NEW — availability table with green/red indicators + row checkboxes
│   │   ├── YardAvailabilityTable.css NEW
│   │   ├── CapacityAssessmentPanel.tsx  NEW — text prompt + Assess Capacity button + spinner + plan table + rationale
│   │   ├── CapacityAssessmentPanel.css  NEW
│   │   ├── GanttChart.tsx            MODIFY — accept planData prop; add drag-drop handlers
│   │   ├── GanttChart.css            MODIFY
│   │   ├── GanttNLEdit.tsx           NEW — NL command input bar with submit + feedback
│   │   ├── GanttNLEdit.css           NEW
│   │   ├── ProjectCard.tsx           MODIFY — add enquiry/confirmed badge
│   │   └── Spinner.tsx               NEW — reusable animated spinner component
│   ├── hooks/
│   │   ├── useProjectDetails.ts      NEW — manages ProjectDetailsForm controlled state, validates required fields, constructs FormData, and calls saveProjectDetails(); returns { formValues, setField, isValid, isSaving, handleSubmit }
│   │   ├── useYardAvailability.ts    NEW — POST to availability stub; spinner state; selection state
│   │   ├── useCapacityPlan.ts        NEW — POST to capacity-plan stub; spinner state; plan + rationale state
│   │   └── useGanttEdit.ts           NEW — plan edit state; undo buffer; NL submit; drag-drop update
│   ├── services/
│   │   ├── api.ts                    MODIFY — add API calls for new endpoints
│   │   ├── session.ts                MODIFY — add plan state persistence keyed by projectId
│   │   └── types.ts                  MODIFY — add new TypeScript types for all new data shapes
│   └── routes.ts                     MODIFY — add /projects/:projectId/proposal route
```

## Implementation Tasks

Tasks are ordered by dependency. Each task is independently buildable and testable.

---

### Task 1 — Backend: Extend Project model and DB migration

**What**: Add new nullable columns to the `Project` table. Add `ProjectType` enum.

**Files**:
- `backend/src/models/database.py` — add `project_type`, `hull_length`, `hull_width`, `hull_height`, `topside_weight`, `preferred_location`, `preferred_yard`, `processes`, `block_breakdown` to `Project`
- Create Alembic migration (or apply SQLAlchemy `create_all` drop-and-recreate for dev)

**New columns on `Project`**:
```python
project_type: Mapped[str]           # "confirmed" | "enquiry", default "confirmed"
hull_length:  Mapped[Optional[float]]
hull_width:   Mapped[Optional[float]]
hull_height:  Mapped[Optional[float]]
topside_weight: Mapped[Optional[float]]
preferred_location: Mapped[Optional[str]]  # "Singapore" | "JY" | "US" | "No preferences"
preferred_yard:     Mapped[Optional[str]]
processes:    Mapped[Optional[dict]]       # JSON list of selected process strings
block_breakdown: Mapped[Optional[str]]     # free text
```

**Acceptance**: `Project` rows can be created with and without the new fields; existing rows (null new columns) load without error. Dev migration: `drop_all` + `create_all` on app startup is acceptable for this sprint. **Pre-merge gate**: Alembic migration must be generated (`alembic revision --autogenerate -m "add project detail columns"`) and committed before merging to master — see Open Decisions.

---

### Task 2 — Backend: New Pydantic schemas

**What**: Add all new request/response schemas to `backend/src/models/schemas.py`.

**New schemas**:
```python
# Date strings throughout all schemas use DD-MM-YYYY format to match the existing CSV
# fixture convention (e.g. "01-02-2026"). Validate on the frontend before submission.
class ProjectDetailsRequest(BaseModel):
    project_type: str          # "confirmed" | "enquiry"
    project_name: str
    start_date: str            # DD-MM-YYYY
    end_date: str              # DD-MM-YYYY
    hull_length: float
    hull_width: float
    hull_height: float
    topside_weight: float
    preferred_location: str
    preferred_yard: str
    processes: List[str]
    block_breakdown: str

class YardAvailabilityRow(BaseModel):
    yard_name: str
    location: str
    availability: str   # "Available" | "Occupied"

class YardAvailabilityResponse(BaseModel):
    yards: List[YardAvailabilityRow]

class CapacityPlanRow(BaseModel):
    project_id: str
    project_name: str
    duration_days: int
    start_date: str            # DD-MM-YYYY
    end_date: str              # DD-MM-YYYY
    resource: str
    dependencies: str
    cost: str
    priority: str

class CapacityPlanResponse(BaseModel):
    plan: List[CapacityPlanRow]
    rationale: str

class CapacityPlanRequest(BaseModel):
    selected_yards: List[str]
    prompt: str

class NLEditRequest(BaseModel):
    command: str

class NLEditAction(BaseModel):
    project_id: str
    field: str           # "resource" (MVP scope)
    from_value: str
    to_value: str

class PlanUpdateRequest(BaseModel):
    rows: List[CapacityPlanRow]
```

**Acceptance**: All schemas import cleanly; Pydantic validation rejects missing required fields with a 422.

---

### Task 3 — Backend: Simulation service

**What**: New `backend/src/services/simulation_service.py` with two async functions implementing the stub logic with artificial delay.

```python
# simulation_service.py

import asyncio, random, csv, pathlib

YARDS = [
    {"yard_name": "JY-QA", "location": "JY", "availability": "Available"},
    {"yard_name": "JY-QB", "location": "JY", "availability": "Available"},
    {"yard_name": "JY-QC", "location": "JY", "availability": "Occupied"},
    {"yard_name": "JY-QD", "location": "JY", "availability": "Available"},
    {"yard_name": "Singapore - Tuas Boulevard", "location": "Singapore", "availability": "Occupied"},
    {"yard_name": "Singapore - Pioneer",        "location": "Singapore", "availability": "Available"},
]

async def simulate_yard_availability() -> list[dict]:
    await asyncio.sleep(random.uniform(10, 20))  # artificial latency
    return YARDS

# Path to the fixture relative to this file (backend/src/services/ → backend/tests/fixtures/)
_FIXTURE_CSV = (
    pathlib.Path(__file__).parents[3] / "tests" / "fixtures" / "sample_plans" / "ai_augmented_plan.csv"
)

def _load_fixture_plan() -> list[dict]:
    """Load hardcoded plan rows from the ai_augmented_plan.csv fixture on disk."""
    with open(_FIXTURE_CSV, newline="") as f:
        return [{k.strip(): v.strip() for k, v in row.items()} for row in csv.DictReader(f)]

async def simulate_capacity_plan(selected_yards: list[str], prompt: str) -> dict:
    await asyncio.sleep(random.uniform(10, 20))  # artificial latency
    plan = _load_fixture_plan()  # real CSV rows: PRJ-F01…PRJ-F23, DD-MM-YYYY dates
    rationale = (
        f"Based on your selection of {', '.join(selected_yards)} and the guidance '{prompt}', "
        "the AI Capacity Planner has allocated projects across the selected quay resources. "
        "High-priority projects (PRJ-F01, PRJ-F21) are anchored to JY-QA to maximise berth "
        "utilisation. Medium-priority projects are distributed across JY-QB through JY-QG to "
        "balance load. The schedule runs from Q1 2026 to Q1 2029 with no resource conflicts "
        "detected. This output is a POC simulation; in production it will be generated by the "
        "AI Capacity Planner API."
    )
    return {"plan": plan, "rationale": rationale}
```

**Acceptance**: Calling either function produces a result after 10–20 s; plan rows are loaded from `ai_augmented_plan.csv` (17 rows, PRJ-F01 through PRJ-F23). Verified by Task 19 tests that monkeypatch `asyncio.sleep` to 0 s and assert `len(response["plan"]) == 17` and `rationale` is non-empty.

---

### Task 4 — Backend: NL parse service

**What**: New `backend/src/services/nl_parse_service.py` with a rule-based regex parser.

**Supported pattern (MVP)**: `change <PROJECT_ID> from <VALUE_A> to <VALUE_B>`

```python
import re

PATTERN = re.compile(
    r"change\s+(?P<project_id>PRJ-[A-Z0-9]+)\s+from\s+(?P<from_value>[^\s]+)\s+to\s+(?P<to_value>[^\s]+)",
    re.IGNORECASE,
)

def parse_nl_command(command: str) -> dict | None:
    m = PATTERN.match(command.strip())
    if not m:
        return None
    return {
        "project_id": m.group("project_id").upper(),
        "field": "resource",
        "from_value": m.group("from_value"),
        "to_value":   m.group("to_value"),
    }
```

Returns `None` on no match; caller raises HTTP 422 with a message showing the supported format.

**Acceptance**: `parse_nl_command("change PRJ-F01 from JY-QA to JY-QB")` returns the correct action dict; unmatched strings return `None`.

---

### Task 5 — Backend: New API routes

**What**: Add 5 new route groups to `backend/src/api/routes.py`.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/projects/{id}/details` | Save project details form data + store uploaded files |
| `POST` | `/api/projects/{id}/yard-availability` | Call `simulate_yard_availability()` — 10–20 s stub |
| `POST` | `/api/projects/{id}/capacity-plan` | Call `simulate_capacity_plan()` — 10–20 s stub |
| `POST` | `/api/projects/{id}/plan-edit/parse` | Call `parse_nl_command()` — returns NLEditAction |
| `PUT`  | `/api/projects/{id}/plan` | Persist updated plan rows (after NL or drag-drop edit) |

Key behaviours:
- `/details` accepts `multipart/form-data` with JSON fields + two file fields (`project_ref` and `human_plan`). Files saved to `uploads/`. Project record updated with new fields.
- `/yard-availability` and `/capacity-plan` use `asyncio` (FastAPI `async def`) so the artificial sleep is non-blocking.
- `/plan-edit/parse` is synchronous (no delay); returns `NLEditAction` or raises HTTP 422 with `{"detail": "Unsupported command. Supported format: change PRJ-XXX from RESOURCE-A to RESOURCE-B"}`.
- `/plan` replaces `plan_data_json` on the `Plan` entity row associated with the project (i.e. `db.query(Plan).filter(Plan.project_id == id).first()` — **not** the `Project` row itself).

**Error responses for stub routes**:
- `/yard-availability` and `/capacity-plan`: if project `id` does not exist, return HTTP 404 `{"detail": "Project not found"}`.
- Both stubs always succeed if the project exists (they are stateless simulations); no other error paths needed for this sprint.

**Acceptance**: All 5 routes return expected response shapes; `/yard-availability` and `/capacity-plan` respond after ≥ 10 s; `/plan-edit/parse` responds in < 200 ms.

---

### Task 6 — Frontend: New TypeScript types

**What**: Extend `frontend/src/services/types.ts` with all new data shapes.

```typescript
export type ProjectType = 'confirmed' | 'enquiry';

export interface ProjectDetails {
  project_type: ProjectType;
  project_name: string;
  start_date: string;
  end_date: string;
  hull_length: number;
  hull_width: number;
  hull_height: number;
  topside_weight: number;
  preferred_location: string;
  preferred_yard: string;
  processes: string[];
  block_breakdown: string;
}

export interface YardAvailabilityRow {
  yard_name: string;
  location: string;
  availability: 'Available' | 'Occupied';
}

export interface CapacityPlanRow {
  project_id: string;
  project_name: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  resource: string;
  dependencies: string;
  cost: string;
  priority: string;
}

export interface CapacityPlanResponse {
  plan: CapacityPlanRow[];
  rationale: string;
}

export interface NLEditAction {
  project_id: string;
  field: string;
  from_value: string;
  to_value: string;
}
```

**Acceptance**: `types.ts` compiles without errors; all interfaces match corresponding Pydantic schemas field-for-field (field names, types, and optionality); `CapacityPlanRow` date fields carry the `// DD-MM-YYYY` comment.

---

### Task 7 — Frontend: API service calls

**What**: Add 5 new functions to `frontend/src/services/api.ts`.

```typescript
export async function saveProjectDetails(projectId: number, formData: FormData): Promise<void>
export async function fetchYardAvailability(projectId: number): Promise<YardAvailabilityRow[]>
export async function fetchCapacityPlan(projectId: number, selectedYards: string[], prompt: string): Promise<CapacityPlanResponse>
export async function parseNLCommand(projectId: number, command: string): Promise<NLEditAction>
export async function updatePlan(projectId: number, rows: CapacityPlanRow[]): Promise<void>
```

Timeout for `fetchYardAvailability` and `fetchCapacityPlan` should be set to 30 s (above the max 20 s stub delay). Use `AbortController` with `setTimeout(() => controller.abort(), 30_000)` passed via `signal` to `fetch`. On abort, throw an `Error('Request timed out after 30s')` that the calling hook treats as an error state and displays to the user (see Task 13 — timeout error state).

**Acceptance**: Each function sends to the documented URL with the correct HTTP method and request shape; `fetchYardAvailability` and `fetchCapacityPlan` abort and throw after 30 s; all functions are exported and importable without TypeScript errors.

---

### Task 8 — Frontend: Session persistence

**What**: Extend `frontend/src/services/session.ts` to save and restore capacity plan state (plan rows + rationale + undo buffer) keyed by `projectId`.

```typescript
export function savePlanState(projectId: number, plan: CapacityPlanRow[], rationale: string): void
export function loadPlanState(projectId: number): { plan: CapacityPlanRow[]; rationale: string } | null
export function clearPlanState(projectId: number): void
export function saveUndoState(projectId: number, previousPlan: CapacityPlanRow[]): void
export function loadUndoState(projectId: number): CapacityPlanRow[] | null
export function clearUndoState(projectId: number): void
```

Storage: `sessionStorage` (clears on tab close; survives in-session navigation).

**Note on `clearPlanState`**: calling `clearPlanState(projectId)` must also internally call `clearUndoState(projectId)`. The two are always cleared together to prevent stale undo snapshots surviving a re-run.

**Acceptance**: `savePlanState` / `loadPlanState` round-trip correctly; `clearPlanState` removes both plan and undo entries; all functions are typed and exported; nothing is written to `localStorage` (only `sessionStorage`).

---

### Task 9 — Frontend: Reusable Spinner component

**What**: New `frontend/src/components/Spinner.tsx` — a simple CSS-animated circle used by both availability and capacity assessment loading states.

```tsx
interface SpinnerProps { label?: string; }
export const Spinner: React.FC<SpinnerProps>
```

Renders a circular CSS `border` animation + optional text label below it.

**Acceptance**: `<Spinner />` renders a visible animated circle; `<Spinner label="Loading..." />` shows the label text below the circle; the component does not depend on any third-party animation library.

---

### Task 10 — Frontend: ProjectDetailsForm component

**What**: New `frontend/src/components/ProjectDetailsForm.tsx`.

**Form sections**:

*Project Data*
- Project type: radio or toggle — "Confirmed" / "Enquiry"
- Project name: text input (pre-filled from project record)
- Start date / End date: date inputs
- Hull length, width, height (metres): number inputs
- Topside weight: number input

*Planning Preferences*
- Block breakdown: textarea
- Preferred location: `<select>` — Singapore · JY · US · No preferences
- Preferred yard: `<select>` — Singapore - Tuas Boulevard · Singapore - Pioneer · JY-QA · JY-QB · JY-QC · JY-QD · No preferences
- Processes to include: checkbox group — drydock · loadout · berthing · Fabrication/Assembly

*File uploads (at bottom of form)*
- "Upload Reference Data (`project_ref.csv`)" — `<input type="file" accept=".csv">`
- "Upload Human Plan" — `<input type="file" accept=".csv">`

Each upload shows filename + row count on success.

"Generate Available Options" button: disabled until all required fields filled **and** both files uploaded.

**Hook**: use `useProjectDetails` for all controlled state and submit logic (see Task 14).

**CSV upload rules** (both files):
- File type validation: reject any file whose name does not end `.csv`; show an inline error `"Only .csv files are accepted."`
- On successful upload, parse the file client-side with a minimal `FileReader` + `csv-parse`-free split to count rows and confirm required columns are present. Required columns for **project_ref.csv**: `project_id, project_name, duration_days, start_date, end_date, resource, dependencies, cost, priority`. Required columns for **Human Plan**: same schema (the file mirrors `ai_augmented_plan.csv`). If any required column is missing, show `"Missing required columns: <list>"`.
- Show filename + row count below the file input on pass.

---

### Task 11 — Frontend: YardAvailabilityTable component

**What**: New `frontend/src/components/YardAvailabilityTable.tsx`.

- Renders a table with columns: checkbox · Yard Name · Location · Availability
- Availability cell shows 🟢 / "Available" or 🔴 / "Occupied" (use CSS-coloured circular `span`, not emoji, for consistency)
- Checkboxes allow multi-row selection; selected yard names are lifted to parent via `onSelectionChange` prop
- "Select all available" helper link

**Acceptance**: Table renders all yard rows; checkboxes update `selectedYards` via `onSelectionChange`; "Select all available" selects only rows with `availability === 'Available'`; availability indicators are CSS circles (not emoji); deselecting a row removes it from `selectedYards`.

---

### Task 12 — Frontend: CapacityAssessmentPanel component

**What**: New `frontend/src/components/CapacityAssessmentPanel.tsx`.

- Shows a `<textarea>` for the planner's text prompt
- "Assess Capacity" button (disabled when no yards selected, replaced by `<Spinner>` while loading)
- On success: renders a plan table (all `CapacityPlanRow` columns) + rationale text block above it
- "Proceed to Gantt →" button appears once the plan is loaded

**Acceptance**: "Assess Capacity" is disabled when `selectedYards` is empty; `<Spinner>` replaces the button during loading; plan table and rationale render on success; "Proceed to Gantt →" is hidden until plan is loaded; error message displays on fetch failure.

---

### Task 13 — Frontend: Rewrite ProjectLandingPage

**What**: Full rewrite of `frontend/src/pages/ProjectLandingPage.tsx`.

**New structure** — linear four-phase layout on a single long page with `<section>` dividers:

```
Phase 1: ProjectDetailsForm
  ↓ (Generate Available Options button)
Phase 2: YardAvailabilityTable (revealed after availability fetch completes)
  ↓ (row selection + Assess Capacity in CapacityAssessmentPanel)
Phase 3: CapacityAssessmentPanel (revealed after ≥1 yard selected)
  ↓ (Proceed to Gantt button)
Phase 4: navigate to /projects/:projectId/gantt
```

Re-run guard: if Phase 2 or 3 results already exist in session when "Generate Available Options" is clicked, show a `ConfirmDialog` ("This will clear all existing availability and plan results. Continue?"). On confirm: call `clearPlanState(projectId)`, then re-fetch.

**Router wiring** (CHK005 — do this in the same Task 13 PR): add the proposal route to `frontend/src/routes.ts`:
```typescript
export const ROUTES = {
  // ...existing routes
  projectProposal: (projectId: number | string) => `/projects/${projectId}/proposal`,
};
```
And register `<Route path="/projects/:projectId/proposal" element={<ProjectLandingPage />} />` in the React Router config (wherever existing routes are declared, e.g. `App.tsx`).

**Timeout error state**: if `fetchYardAvailability` or `fetchCapacityPlan` throws (including a 30 s abort), hide the spinner, re-enable the triggering button, and display an inline error banner: `"Request timed out. Please try again."` The page stays in its current phase — do not clear previously loaded phase results.

**Acceptance**: All four phases render in sequence with correct gating (Phase N+1 hidden until Phase N completes); re-run shows confirmation dialog when Phase 2 or 3 data is in session; `clearPlanState` called on confirm before re-fetch; `routes.ts` updated with `/projects/:projectId/proposal` route; timeout error banner visible on simulated abort without clearing prior results.

---

### Task 14 — Frontend: New hooks

**Three new hooks:**

**`useProjectDetails(projectId, initialName)`**
```typescript
{ formValues, setField, isValid, isSaving, fileErrors, handleRefFileUpload, handleHumanPlanUpload, handleSubmit }
```
Manages all `ProjectDetailsForm` controlled state. `isValid` is `true` only when all required fields are non-empty **and** both CSV files have passed column validation. `handleSubmit` constructs a `FormData` and calls `saveProjectDetails(projectId, formData)`; sets `isSaving` to `true` for the duration. `fileErrors` holds per-field upload error strings.
```typescript
{ yards, isLoading, error, fetchAvailability, selectedYards, setSelectedYards }
```
Calls `fetchYardAvailability`; manages `isLoading` for spinner; stores `selectedYards`. On fetch error (including timeout abort), sets `error` string and leaves `yards` unchanged.

**`useCapacityPlan(projectId)`**
```typescript
{ plan, rationale, isLoading, error, fetchPlan }
```
Calls `fetchCapacityPlan`; persists result via `savePlanState`.

**`useGanttEdit(projectId, initialPlan)`**
```typescript
{
  plan,           // current plan rows
  undoPlan,       // previous plan rows | null
  applyNLEdit,    // (command: string) => Promise<void>
  applyDragEdit,  // (projectId: string, field: string, newValue: string) => void
  undo,           // () => void
  canUndo,        // boolean
}
```
- `applyNLEdit`: POSTs command to `/plan-edit/parse`, receives `NLEditAction`, applies to `plan`, saves undo snapshot, calls `updatePlan`
- `applyDragEdit`: applies the change locally, saves undo snapshot, calls `updatePlan`
- `undo`: swaps `plan` with `undoPlan`, clears undo snapshot, calls `updatePlan`

**Acceptance**: `useGanttEdit.undo()` restores the previous plan; `canUndo` is `false` initially and after `undo()` is called; all four hooks compile with no TypeScript errors and satisfy their documented return signatures; `useProjectDetails.isValid` is `false` until all required fields and file validations pass.

---

### Task 15 — Frontend: GanttNLEdit component

**What**: New `frontend/src/components/GanttNLEdit.tsx`.

```tsx
interface GanttNLEditProps {
  onSubmit: (command: string) => Promise<void>;
  isLoading: boolean;
  lastResult?: string;     // summary of last successful edit
  error?: string;
}
```

Renders a text input + "Apply" submit button. While `isLoading`: button disabled, small inline spinner shown. Shows last result or error below the input.

**Acceptance**: `<GanttNLEdit>` renders input + button; `isLoading=true` disables the button and shows inline `<Spinner>`; `error` prop displays below; `lastResult` displays on success; NL parse round-trip completes in < 2 s (measured manually against the stub).

---

### Task 16 — Frontend: Modify GanttChart for interactivity

**What**: `frontend/src/components/GanttChart.tsx` — significant modification.

**Changes**:
1. Accept `planData: CapacityPlanRow[]` and `humanPlanData: CapacityPlanRow[]` as props (replacing hardcoded static data).
2. Add drag-and-drop to task bars:
   - **Vertical drag** (row change): on mouse-up on a different resource row, call `onBarRowChange(projectId, newResource)` prop.
   - **Horizontal drag** (date shift): on mouse-up, calculate delta days from pixel offset, call `onBarDateShift(projectId, deltaDays)` prop.
   - **Guard rules**:
     - Duration guard: if `deltaDays` would result in `start_date === end_date` (i.e. duration ≤ 0 days), snap back.
     - Date range guard: "out-of-range" means outside the project’s own `start_date`–`end_date` span as defined in the `CapacityPlanRow`. Derive the overall Gantt extent as `min(all start_dates)` to `max(all end_dates)` across the full `planData` array; any bar shift that would move a task completely outside this extent is rejected as out-of-range.
     - Resource guard: valid resources are the **distinct `resource` values present in `planData`** (not a hardcoded list). A vertical drag targeting a row whose label is not in this set snaps back.
     - On any guard trigger, call `onDragError(message)` with a human-readable message.
3. The chart container needs a stable pixel-width-to-day mapping. Derive it as:
   ```
   daysPerPixel = totalDays / chartWidthPx
   deltaDays = Math.round(dragDeltaPx * daysPerPixel)
   ```
   where `chartWidthPx` is read from the chart container’s `offsetWidth` at drag start, and `totalDays` is `max(end_date) - min(start_date)` across all rows.

**Note**: Use native HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDrop`) to avoid introducing a new library.

**Acceptance**: Dragging a bar vertically changes its `resource` row; dragging horizontally shifts its dates by the correct `deltaDays`; invalid drags (zero-duration, out-of-extent, unknown resource) snap back with `onDragError` called; `planData` prop drives rendering instead of hardcoded data; drag-drop re-render completes in < 1 s (measured manually with ~17 rows).

---

### Task 17 — Frontend: Modify GanttPage

**What**: `frontend/src/pages/GanttPage.tsx` — add interactive controls and load live plan data.

**Changes**:
1. Load plan from session (`loadPlanState(projectId)`) on mount; if absent, show "No plan loaded" with a **← Back to Project Details** link (`ROUTES.projectProposal(projectId)`).
2. Wire `useGanttEdit` hook.
3. Render `<GanttNLEdit>` below the chart header.
4. Render "Undo" button (disabled when `!canUndo`).
5. Render "Download Chart" and "Download Data" buttons:
   - **Download Chart**: **Pre-task check** — run `grep -r 'html-to-image' frontend/package.json` before implementing. If present, use `html-to-image`'s `toPng(containerElement)`. If absent, add `"html-to-image": "^1.11.11"` to `package.json` and re-run `npm install` (lightweight, MIT, no conflicts at demo scale).
   - **Download Data**: build a CSV string from `plan` rows and trigger a `<a download="plan.csv">` click.
6. Pass `onBarRowChange` and `onBarDateShift` from `useGanttEdit` down to `<GanttChart>`.

**Acceptance**: Plan loads from session on mount; "No plan loaded" + `← Back to Project Details` link shown when session is empty; NL edit, undo, "Download Chart" (PNG file), and "Download Data" (CSV file) all functional; "Undo" button is disabled until an edit is applied.

---

### Task 18 — Frontend: ProjectCard enquiry badge

**What**: `frontend/src/components/ProjectCard.tsx` — minor modification.

If `project.project_type === 'enquiry'`, render a small `<span className="badge badge-enquiry">Enquiry</span>` tag below the project name. Add CSS for the badge (yellow/amber pill to contrast with the "Confirmed" default which has no badge).

**Acceptance**: Badge renders for `project_type === 'enquiry'`; no badge rendered for `'confirmed'`; badge background is amber/yellow with legible text; no other `ProjectCard` behaviour changes.

---

### Task 19 — Backend: pytest tests for new endpoints

**What**: New `backend/tests/test_002_enquiry_proposal.py`.

Tests to cover:
- `POST /api/projects/{id}/details` — 200 with valid payload; 422 with missing fields
- `POST /api/projects/{id}/plan-edit/parse` — correct action returned for supported pattern; 422 for unsupported pattern
- `PUT /api/projects/{id}/plan` — 200; plan_data_json updated on DB record
- `POST /api/projects/{id}/yard-availability` — 200; response contains list of yard rows (mock the `asyncio.sleep` in tests with `monkeypatch`)
- `POST /api/projects/{id}/capacity-plan` — 200; response contains `plan` list and `rationale` string (mock sleep)

---

## Dependency Order

```
Task 1 (DB) → Task 2 (schemas) → Task 3 (simulation svc) → Task 4 (NL parse svc) → Task 5 (routes) → Task 19 (tests)
                   ↓ (type contract)
Task 6 (TS types) → Task 7 (API calls) → Task 8 (session) → Task 9 (Spinner)
    └─────────────────────────────────────────────────────────────┘
                                    ↓
    Task 14 (all 4 hooks: useProjectDetails, useYardAvailability, useCapacityPlan, useGanttEdit)
                                    ↓
            Task 10 (ProjectDetailsForm)
            Task 11 (YardAvailabilityTable)
            Task 12 (CapacityAssessmentPanel)
                                    ↓
            Task 13 (ProjectLandingPage rewrite + routes.ts wiring)
                                    ↓
            Task 15 (GanttNLEdit)         ← useGanttEdit from Task 14
            Task 16 (GanttChart mods)     ← useGanttEdit from Task 14
            Task 17 (GanttPage mods)      ← useGanttEdit from Task 14

Task 18 (ProjectCard badge) — independent; can run any time after Task 6
```

**Dependency notes**:
- **Task 2 → Task 6 (implicit)**: TypeScript interfaces in Task 6 must mirror the Pydantic schemas defined in Task 2 field-for-field. Task 6 should be authored after Task 2 is finalised to avoid drift. The backend and frontend can still be built in parallel; just sync the schemas before merging.
- **Task 14 scope**: Task 14 produces all four hooks consumed downstream. Build all hooks together before starting Tasks 10–13 and 15–17 to avoid circular work-in-progress dependencies.
- Backend tasks (1–5, 19) and frontend infrastructure tasks (6–9) are otherwise independently parallelisable.

## Open Decisions (carry into tasks)

- **Drag-and-drop library** *(owner: Task 16)*: using native HTML5 drag events to avoid new dependencies. If too constrained, `@dnd-kit/core` (MIT, no conflicts) is the fallback. Decision must be confirmed before Task 16 begins.
- **`html-to-image` for chart download** *(owner: Task 17 pre-step)*: run `grep 'html-to-image' frontend/package.json` at the start of Task 17. If present, use it directly. If absent, add `"html-to-image": "^1.11.11"` and run `npm install`. Do not assume presence.
- **Alembic vs `create_all`** *(owner: Task 1 pre-merge gate)*: for dev speed, `drop_all` + `create_all` on startup is acceptable for this sprint. **Before merging to master**: run `alembic revision --autogenerate -m "add project detail columns"`, review the generated migration, and commit it to `backend/db/migrations/`. This is a hard pre-merge gate, not optional.

