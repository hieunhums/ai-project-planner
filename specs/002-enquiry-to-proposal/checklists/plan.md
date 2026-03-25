# Plan Quality Checklist: Enquiry to Proposal

**Purpose**: Validate implementation plan completeness, clarity, and consistency before task breakdown begins — "unit tests for the plan document"
**Created**: February 27, 2026 | **Validated**: February 27, 2026 | **Status**: All 30 items resolved ✓
**Feature**: [plan.md](../plan.md) · [spec.md](../spec.md)

---

## Requirement Completeness

- [x] CHK001 — Is the implementation of the simulation plan rows in Task 3 fully specified, or is `plan = [... rows matching ai_augmented_plan.csv ...]` a placeholder that will leave the developer guessing? [Completeness, Plan §Task 3] → **Resolved**: Task 3 uses `csv.DictReader` to load the real fixture at `backend/tests/fixtures/sample_plans/ai_augmented_plan.csv` (17 rows confirmed); placeholder removed.
- [x] CHK002 — Is a task defined for parsing the uploaded "Human Plan" CSV into `humanPlanData: CapacityPlanRow[]` for the Gantt chart? [Gap] → **Resolved**: Task 10 now includes client-side `FileReader` column-presence validation for both uploads; human plan uses same `CapacityPlanRow` column schema (confirmed from fixture).
- [x] CHK003 — Is `useProjectDetails` covered by a task? [Completeness, Plan §Project Structure] → **Resolved**: File tree entry now has full description; `useProjectDetails` added as first hook in Task 14 with complete return signature.
- [x] CHK004 — Are the `research.md`, `data-model.md`, `contracts/` YAML files, and `quickstart.md` in the docs tree actually sprint deliverables? [Completeness, Plan §Project Structure] → **Resolved**: Documentation tree annotated as speckit template scaffolding placeholders — **not sprint deliverables**.
- [x] CHK005 — Is a task defined for wiring the new route `/projects/:projectId/proposal` into React Router? [Gap] → **Resolved**: Task 13 now owns the `routes.ts` update and `<Route>` registration in `App.tsx`.
- [x] CHK006 — Are error response requirements defined for the `/yard-availability` and `/capacity-plan` stub routes? [Completeness, Plan §Task 5] → **Resolved**: Task 5 specifies HTTP 404 on unknown project ID; both stubs otherwise always succeed.
- [x] CHK007 — Is CSV validation (column presence) for the two file uploads in Task 10 specified? [Completeness, Spec §FR-006/FR-007] → **Resolved**: Task 10 lists required columns for both uploads and defines error message format.
- [x] CHK008 — Is an Alembic migration task explicitly included for production readiness? [Gap] → **Resolved**: Task 1 Acceptance now includes the Alembic pre-merge gate; Open Decisions assigns it as a hard pre-merge requirement owned by Task 1.

---

## Plan Clarity

- [x] CHK009 — Is the derivation of the resource list used by the Gantt drag-drop guard clearly specified? [Clarity, Plan §Task 16] → **Resolved**: Task 16 states "valid resources are the distinct `resource` values present in `planData`" — derived from live plan.
- [x] CHK010 — Is the pixel-width-to-day mapping for horizontal drag defined? [Clarity, Plan §Task 16] → **Resolved**: Task 16 now includes the formula: `daysPerPixel = totalDays / chartWidthPx; deltaDays = Math.round(dragDeltaPx * daysPerPixel)`.
- [x] CHK011 — Is the 30-second fetch timeout implementation approach specified? [Clarity, Plan §Task 7] → **Resolved**: Task 7 specifies `AbortController` with `setTimeout(() => controller.abort(), 30_000)` passed via `signal` to `fetch`.
- [x] CHK012 — Are the required columns of the human plan CSV explicitly defined? [Clarity, Plan §Task 10] → **Resolved**: Human plan uses same `CapacityPlanRow` schema; all columns listed in Task 10 CSV upload rules.
- [x] CHK013 — Is the `PUT /api/projects/{id}/plan` target record unambiguous? [Clarity, Plan §Task 5] → **Resolved**: Task 5 clarified: targets the `Plan` entity row (`db.query(Plan).filter(Plan.project_id == id).first()`), not the `Project` row.

---

## Plan Consistency

- [x] CHK014 — Do stub route paths in Task 5 conflict with the Constitution Check `/api/simulate/` prefix claim? [Conflict, Plan §Constitution Check vs §Task 5] → **Resolved**: Constitution Check updated to remove `/api/simulate/` prefix; the `# STUB` comment is the code-level marker.
- [x] CHK015 — Does Task 17's "already in project" claim for `html-to-image` conflict with the Open Decisions verify-first note? [Conflict, Plan §Task 17 vs §Open Decisions] → **Resolved**: Task 17 now says "pre-task check — run `grep` before implementing; add if absent". Open Decisions updated to match.
- [x] CHK016 — Is `useProjectDetails` referenced consistently across plan sections? [Consistency, Plan §Project Structure vs §Tasks 10/13] → **Resolved**: File tree has full description; Task 14 defines it; Task 10 references it explicitly.
- [x] CHK017 — Are date format conventions consistent across all new schemas? [Consistency, Plan §Task 2] → **Resolved**: Task 2 Pydantic schemas annotate date fields `# DD-MM-YYYY`; TypeScript types in Task 6 carry same comment. Matches existing CSV fixture (`01-02-2026`).
- [x] CHK018 — Is undo state cleared when `clearPlanState` is called? [Consistency, Plan §Tasks 8/13/14] → **Resolved**: Task 8 explicitly states `clearPlanState` must internally call `clearUndoState` — always cleared together.

---

## Task Acceptance Criteria Quality

- [x] CHK019 — Do Tasks 6–18 have explicit, testable acceptance criteria? [Measurability] → **Resolved**: Acceptance statements added to all 13 frontend tasks (Tasks 6–18).
- [x] CHK020 — Are performance goals measurable per task? [Measurability, Plan §Technical Context] → **Resolved**: Task 15 acceptance references NL parse `< 2 s`; Task 16 acceptance references drag-drop re-render `< 1 s`.
- [x] CHK021 — Is it specified how Task 3's stub is considered "done"? [Measurability, Plan §Task 3] → **Resolved**: Task 3 acceptance states "Verified by Task 19 tests that monkeypatch `asyncio.sleep` to 0 s and assert 17 rows".

---

## Dependency & Sequencing Coverage

- [x] CHK022 — Does Task 7 have an implicit dependency on Task 2 that the diagram omits? [Dependency, Plan §Dependency Order] → **Resolved**: Dependency diagram updated with `Task 2 → Task 6 (implicit)` note explaining that TypeScript interfaces must mirror Pydantic schemas.
- [x] CHK023 — Is human plan CSV parsing tracked in the dependency graph? [Gap, Plan §Dependency Order] → **Resolved**: Task 10 owns client-side parsing; `humanPlanData` flow (Task 10 → Task 13 → Task 16/17) in revised dependency diagram.
- [x] CHK024 — Is Task 14 correctly ordered relative to Tasks 15–17? [Dependency, Plan §Dependency Order] → **Resolved**: Dependency diagram corrected — Task 14 feeds into Tasks 10–13 AND Tasks 15–17. Both downstream paths now shown.

---

## Edge Case & Error Path Coverage

- [x] CHK025 — Is the frontend error state covered for the 30-second timeout? [Coverage, Gap] → **Resolved**: Task 7 specifies abort throws `Error('Request timed out after 30s')`; Task 13 specifies inline error banner, spinner hidden, button re-enabled, prior results preserved.
- [x] CHK026 — Is the "no plan loaded" empty state in Task 17 fully specified? [Clarity / Coverage, Plan §Task 17] → **Resolved**: Task 17 specifies "← Back to Project Details" link targeting `ROUTES.projectProposal(projectId)`.
- [x] CHK027 — Are drag-and-drop out-of-range constraints defined? [Clarity / Coverage, Plan §Task 16] → **Resolved**: "Out-of-range" defined as outside overall Gantt extent: `min(all start_dates)` to `max(all end_dates)` across full `planData`.
- [x] CHK028 — Is behaviour defined when a non-CSV or malformed CSV is uploaded? [Coverage, Gap] → **Resolved**: Task 10 specifies file type rejection with `"Only .csv files are accepted."`; missing columns show `"Missing required columns: <list>"`.

---

## Open Decisions & Assumptions

- [x] CHK029 — Are Open Decisions assigned to a specific task? [Assumption, Plan §Open Decisions] → **Resolved**: `html-to-image` assigned to Task 17 pre-step; drag-and-drop library decision assigned to Task 16.
- [x] CHK030 — Is the "Alembic vs `create_all`" decision tracked as a task-level gate? [Assumption, Plan §Open Decisions] → **Resolved**: Open Decisions marks it as a hard pre-merge gate owned by Task 1; `alembic revision --autogenerate` step specified.

---

## Notes

- All 30 items resolved during validation on February 27, 2026.
- Categories with most gaps: **Requirement Completeness** (8 items) and **Edge Case Coverage** (4 items).
- Highest-impact fixes: Task 3 placeholder replaced with real fixture loading; Task 16 resource list + pixel formula + out-of-range defined; dependency diagram corrected (Task 14 ordering, Task 2→6 edge); Task 7/13 timeout error chain.
- Plan is ready for `/speckit.tasks`.
