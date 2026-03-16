# Feature Specification: Enquiry to Proposal — End-to-End Planning Workflow

**Feature Branch**: `002-enquiry-to-proposal`  
**Created**: February 27, 2026  
**Status**: Draft  
**Input**: User description: "New project form (confirmed/enquiry type, hull/topside data, planning preferences, project_ref.csv upload), yard availability check via AI/ML Planner (simulated), capacity assessment via AI Capacity Planner (simulated, outputs ai_augmented_plan table with rationale), interactive Gantt chart with natural-language and drag-drop editing, and download of chart image and data CSV."

## Context & Scope

This sprint replaces the current 3-step upload-and-generate project landing workflow (specified in `001-ui-login-projects` and `001-ai-planning-assistant`) with a richer, multi-phase planning journey. The login, project list, and project creation modal from sprint `001-ui-login-projects` remain unchanged. This sprint redesigns what happens **after** a new project is created, delivering a four-phase flow:

1. **Project Details & References** — the planner fills in project data and planning preferences, then uploads a reference file.
2. **Yard Availability** — a simulated AI/ML Planner API returns yard availability per location.
3. **Feasibility & Capacity Assessment** — a simulated AI Capacity Planner API produces an augmented plan table and rationale.
4. **Interactive Gantt & Export** — the planner edits the plan via natural language or drag-and-drop, then downloads the result.

## Clarifications

### Session 2026-02-27

- Q: Does "enquiry" vs "confirmed" project type affect downstream planning logic? → A: For this POC both types follow the same flow; the type is recorded as metadata and shown on the project card. Enquiry projects display a distinct visual badge (e.g., "Enquiry") vs "Confirmed".
- Q: Should the natural-language Gantt edit be a persistent AI chat thread or a single-shot command? → A: Single-shot command per edit; the user types a command, the system applies it, and the updated table and chart are immediately reflected. No chat history is required for this sprint.
- Q: When multiple yards are selected for capacity assessment, does the output plan cover all selected yards simultaneously, or produce one plan per yard? → A: The simulated output is a single consolidated plan (the `ai_augmented_plan.csv` structure) that may span multiple yards; the rationale text explains how yards were combined.
- Q: What is the source of the human-generated plan displayed on the Gantt chart in this sprint? → A: A separate "Upload Human Plan" file input is added to the project details form (alongside the `project_ref.csv` upload). The uploaded human plan CSV provides the Gantt baseline overlay; `project_ref.csv` remains the AI reference input only.
- Q: What happens when the planner re-runs "Generate Available Options" after downstream results already exist? → A: Full downstream reset — the availability table, capacity plan, rationale, Gantt data, and any plan edits are all cleared. The planner restarts from Phase 2 with a fresh availability result.
- Q: Where should the simulated API responses be implemented, and how should processing be indicated to the user? → A: Backend stub endpoints (FastAPI routes returning hardcoded/synthetic JSON) with a 10–20 second artificial delay to simulate real API latency. The frontend displays a continuously animated spinner (running process circle) for the full duration; the spinner replaces the trigger button area and is dismissed only when the response arrives.
- Q: Where should natural-language command parsing run? → A: Backend rule-based endpoint — a FastAPI stub parses the command server-side using regex/rules and returns a structured edit action (JSON). No LLM is used for this sprint. The frontend POSTs the raw command string, receives the structured action, and applies it to the plan data before re-rendering the Gantt.
- Q: Should the planner be able to undo Gantt edits? → A: Single-step undo — an "Undo" button reverses the most recent NL or drag-drop edit. Only one level of undo is supported per session.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter New Project Details and Upload References (Priority: P1)

After creating a new project from the project list (unchanged from `001-ui-login-projects`), the planner is taken to a project details form. They fill in project metadata, planning preferences, and upload a reference file before proceeding.

**Why this priority**: This is the mandatory entry point to the new planning workflow. Without project details and a reference file, no downstream AI steps can run.

**Independent Test**: Can be fully tested by creating a project, completing the details form with all required fields, uploading a `project_ref.csv` reference file and a separate human plan CSV, and confirming the form validates correctly and a "Generate Available Options" button becomes active.

**Acceptance Scenarios**:

1. **Given** a planner has created a new project, **When** they land on the project details page, **Then** a form is displayed with all required fields grouped into "Project Data" and "Planning Preferences" sections.
2. **Given** the form is displayed, **When** the planner selects "Enquiry" as project type, **Then** the project is tagged as an enquiry and a visible badge distinguishes it from confirmed projects.
3. **Given** the planner fills in hull dimensions (length, width, height in metres) and topside weight, **When** they proceed, **Then** these values are saved as project metadata.
4. **Given** the "Preferred Yard" dropdown is shown, **When** the planner selects a yard, **Then** the selection is valid only for yards in the list: "Singapore - Tuas Boulevard", "Singapore - Pioneer", "JY-QA", "JY-QB", "JY-QC", "JY-QD", "No preferences".
5. **Given** the planner selects one or more processes from the checkbox list ("drydock", "loadout", "berthing", "Fabrication/Assembly"), **When** they save, **Then** all selections are persisted as planning preferences.
6. **Given** all form fields are filled, **When** the planner uploads a `project_ref.csv` reference file, **Then** the file is accepted and a confirmation is shown with file name and row count.
7. **Given** all form fields are filled, **When** the planner uploads a human plan CSV (the existing schedule to use as the Gantt baseline), **Then** the file is accepted and a confirmation is shown with file name and row count.
8. **Given** the reference file and the human plan file are both uploaded and all required fields are complete, **When** the form is reviewed, **Then** the "Generate Available Options" button becomes active.
9. **Given** a required field is missing or either file has not been uploaded, **When** the planner attempts to proceed, **Then** the missing field or file is highlighted and the action is blocked with a clear message.


---

### User Story 2 - Generate and View Yard Availability (Priority: P2)

The planner triggers the AI/ML Planner to check which yards can accommodate the new project. The system returns a table of yards with their availability status.

**Why this priority**: Yard availability is the first decision gate — planners must know which yards are free before investing time in capacity planning. This step is independently demonstrable as a "slot checker."

**Independent Test**: Can be fully tested by clicking "Generate Available Options" on a completed project form and confirming that a table appears listing at least the configured yards, each with a Yard Name, Location, and a green (available) or red (occupied) availability indicator.

**Acceptance Scenarios**:

1. **Given** the planner clicks "Generate Available Options", **When** the request is sent to the AI/ML Planner (simulated), **Then** a loading indicator is shown while the response is awaited.
2. **Given** the API responds, **When** results are displayed, **Then** a table is shown with columns: "Yard Name", "Location", and "Availability".
3. **Given** a yard is available, **When** its row is displayed, **Then** a green symbol appears in the Availability column alongside the text "Available".
4. **Given** a yard is occupied, **When** its row is displayed, **Then** a red symbol appears in the Availability column alongside the text "Occupied".
5. **Given** the availability table is shown, **When** the planner reviews it, **Then** they can select one or more rows (yards) for the next step.
6. **Given** no yards are available, **When** all rows show "Occupied", **Then** the planner is informed that no yards are currently free and can still proceed or contact support.

---

### User Story 3 - Assess Capacity and Generate Augmented Plan (Priority: P2)

With one or more yards selected, the planner provides additional context via a short text prompt and triggers the AI Capacity Planner. The system returns an augmented plan table and a rationale explanation.

**Why this priority**: This is the core AI value step — translating yard availability into a concrete schedule. It is independently demonstrable as an "AI plan generator" given a pre-populated availability table.

**Independent Test**: Can be fully tested by selecting one or more yard rows from the availability table, entering a brief text prompt (e.g., "Prioritise JY-QA for hull block work"), clicking "Assess Capacity", and confirming that a plan table and rationale text appear below.

**Acceptance Scenarios**:

1. **Given** the planner has selected at least one yard row, **When** they enter a text prompt and click "Assess Capacity", **Then** a loading indicator is shown while the AI Capacity Planner (simulated) processes the request.
2. **Given** the API responds, **When** the plan is displayed, **Then** a table is shown with columns matching the augmented plan structure: project ID, project name, duration (days), start date, end date, resource, dependencies, cost, and priority.
3. **Given** the plan table is shown, **When** displayed, **Then** a rationale text block appears above or below the table explaining the reasoning behind the plan, including how the selected yards, planner's text prompt, and project preferences influenced the allocation.
4. **Given** no yard is selected, **When** the planner attempts to trigger capacity assessment, **Then** the button is disabled and a tooltip advises them to select at least one yard.
5. **Given** multiple yards are selected, **When** the plan is generated, **Then** the rationale explains how tasks are distributed across those yards.

---

### User Story 4 - View Interactive Gantt Chart (Priority: P3)

After the augmented plan is generated, the planner proceeds to the Gantt chart view, which superimposes the human-generated plan and the AI-augmented plan on the same timeline for comparison.

**Why this priority**: The Gantt chart is the primary visual artefact planners use to communicate schedules. This step builds on `001-ai-planning-assistant` FR-004 but now shows the plan produced by the capacity assessment step rather than static data.

**Independent Test**: Can be fully tested by completing the capacity assessment step and confirming that the Gantt chart displays both plans (human and AI-augmented) as overlapping bars across the correct resource rows and date range.

**Acceptance Scenarios**:

1. **Given** the capacity assessment is complete, **When** the planner navigates to the Gantt view, **Then** both the human plan (from the uploaded human plan CSV) and the AI-augmented plan are shown as superimposed bars on the same resource-time grid.
2. **Given** both plans are shown, **When** the planner reads the chart, **Then** the two plans are visually distinguishable (e.g., different colours or bar styles) with a legend.
3. **Given** the chart is displayed, **When** the planner reviews it, **Then** task bars show at minimum: project ID, resource assignment, and date range.

---

### User Story 5 - Edit the Plan via Natural Language (Priority: P3)

The planner can type a plain-language instruction to modify the plan (for example, reassigning a project to a different yard or shifting a date). The underlying data table and Gantt chart immediately reflect the change.

**Why this priority**: Natural-language editing is a key differentiator for AI-augmented planning, enabling quick corrections without manual table editing. It builds on the AI reasoning established in sprint `001-ai-planning-assistant`.

**Independent Test**: Can be fully tested by entering a command such as "change PRJ-F01 from JY-QA to JY-QB", confirming that the plan table row updates accordingly, and that the Gantt bar for PRJ-F01 moves to the JY-QB resource row.

**Acceptance Scenarios**:

1. **Given** the Gantt chart is displayed, **When** the planner types a natural language instruction (e.g., "change PRJ-F01 from JY-QA to JY-QB") and submits it, **Then** the system interprets the instruction and applies the change to the underlying plan data.
2. **Given** a change is applied, **When** the plan data is updated, **Then** the Gantt chart re-renders to reflect the new assignment without a full page reload.
3. **Given** a change is applied, **When** the planner scrolls to the plan table, **Then** the table row for the affected project shows the updated values.
4. **Given** the instruction is ambiguous or references a non-existent project ID, **When** the planner submits it, **Then** the system displays a clear error message explaining why the instruction could not be applied; no data is changed.
5. **Given** a change is successfully applied, **When** shown, **Then** the planner can see a summary of what changed (e.g., "PRJ-F01 resource changed from JY-QA to JY-QB").

---

### User Story 6 - Edit the Plan via Drag-and-Drop on the Gantt Chart (Priority: P3)

The planner can drag a task bar to a new position (new resource row or new date range) on the Gantt chart using the mouse. The underlying data table updates automatically.

**Why this priority**: Drag-and-drop is the most intuitive way to make ad-hoc adjustments on a Gantt chart; it gives planners direct manipulation and complements natural-language editing.

**Independent Test**: Can be fully tested by dragging a task bar to a different resource row and confirming the plan table row reflects the new resource assignment. Dragging to a new date position should update the start/end dates in the table.

**Acceptance Scenarios**:

1. **Given** the Gantt chart is displayed, **When** the planner drags a task bar to a different resource row, **Then** the resource assignment in the underlying plan table is updated to match the new row.
2. **Given** the Gantt chart is displayed, **When** the planner drags a task bar horizontally (earlier or later on the timeline), **Then** the start and end dates in the underlying plan table are updated proportionally.
3. **Given** a drag is completed, **When** the planner inspects the plan table, **Then** the updated values are immediately visible in the corresponding row.
4. **Given** a drag would place a task outside the valid date range or to an invalid resource, **When** the planner releases the drag, **Then** the bar snaps back to its original position and a brief error message explains the constraint.

---

### User Story 7 - Download Gantt Chart and Plan Data (Priority: P4)

The planner can download the current Gantt chart as an image and the underlying plan data as a CSV file.

**Why this priority**: Download is essential for sharing outputs with stakeholders and integration into external tools. It is the natural endpoint of the planning workflow.

**Independent Test**: Can be fully tested by clicking "Download Chart" and confirming a PNG/JPEG image of the Gantt chart is saved, and clicking "Download Data" and confirming a CSV matching the current plan table is saved.

**Acceptance Scenarios**:

1. **Given** the Gantt chart is displayed, **When** the planner clicks "Download Chart", **Then** a raster image of the full Gantt chart is downloaded to the user's device.
2. **Given** the planner has made edits (via NL or drag-drop), **When** they download the chart, **Then** the downloaded image reflects all current edits.
3. **Given** the Gantt chart is displayed, **When** the planner clicks "Download Data", **Then** a CSV file containing the current state of the plan table is downloaded (including any NL or drag-drop edits).
4. **Given** the download is triggered, **When** the file is saved, **Then** the CSV columns match the augmented plan structure (project ID, project name, duration, start date, end date, resource, dependencies, cost, priority).

---

### Edge Cases

- What happens if the planner uploads a `project_ref.csv` file with unexpected or missing columns? → Upload is accepted but a warning lists any unrecognised columns; planning continues with recognised data.
- What if the AI/ML Planner simulation returns no available yards? → All rows show "Occupied" with a clear message; the planner can still select occupied yards if they wish to explore capacity regardless.
- What if the natural-language instruction references multiple changes at once (e.g., "move PRJ-F01 to JY-QB and shift PRJ-F04 by 2 weeks")? → For this sprint, only single-entity changes are guaranteed to be interpreted; multi-entity instructions should fail gracefully with a message requesting one change at a time.
- What happens to edits (NL or drag-drop) if the planner navigates away and returns? → Edits are persisted in the project session; on return the last-saved plan state is shown.
- What happens if the planner re-runs "Generate Available Options" after a capacity plan and Gantt edits already exist? → A confirmation warning is shown explaining that all downstream state (availability, capacity plan, Gantt data, edits) will be cleared. On confirmation, the full reset occurs and the planner restarts from Phase 2.
- What if the planner drags a bar so that its duration would be reduced to zero (collapsed)? → The drag is cancelled; the bar snaps back and an error prevents zero-duration allocations.

## Requirements *(mandatory)*

### Functional Requirements

#### Phase 1 — Project Details Form

- **FR-001**: The project details form MUST capture: project type (confirmed or enquiry), project name, start date, end date, hull length (metres), hull width (metres), hull height (metres), and topside weight.
- **FR-002**: The "Preferred Location" field MUST be a dropdown limited to: "Singapore", "JY", "US", "No preferences".
- **FR-003**: The "Preferred Yard" field MUST be a dropdown limited to: "Singapore - Tuas Boulevard", "Singapore - Pioneer", "JY-QA", "JY-QB", "JY-QC", "JY-QD", "No preferences".
- **FR-004**: The "Processes to Include" field MUST be a multi-select checkbox list containing: "drydock", "loadout", "berthing", "Fabrication/Assembly".
- **FR-005**: The "Block Breakdown" field MUST be a free-text input for the planner to describe how the hull is subdivided.
- **FR-006**: The planner MUST upload both a `project_ref.csv` (AI reference input) and a separate human plan CSV (Gantt baseline) before the "Generate Available Options" action becomes available.
- **FR-006a**: The human plan CSV upload MUST be clearly labelled to distinguish it from the `project_ref.csv` upload (e.g., "Upload Human Plan" vs "Upload Reference Data").
- **FR-007**: On successful upload of either file, the system MUST display the uploaded filename and the number of records detected.
- **FR-008**: All project data and planning preferences MUST be persisted against the project record.
- **FR-009**: Projects with type "enquiry" MUST display a distinct visual badge throughout the application (project list card and project header).

#### Phase 2 — Yard Availability

- **FR-010**: Clicking "Generate Available Options" MUST trigger a call to the AI/ML Planner backend stub endpoint (e.g., `POST /api/yard-availability`). The stub MUST introduce a 10–20 second artificial delay before returning its hardcoded response, to simulate real API latency.
- **FR-010a**: If yard availability results, a capacity plan, or Gantt data already exist for the project when "Generate Available Options" is clicked again, the system MUST clear all downstream state (availability results, capacity plan, rationale text, Gantt plan data, and any Gantt edits) before fetching new results. The planner MUST be shown a confirmation warning before the reset proceeds.
- **FR-011**: While awaiting the AI/ML Planner response, the system MUST display a continuously animated spinner (running process circle) in place of or adjacent to the "Generate Available Options" button. The button itself MUST be disabled for the duration. The spinner is dismissed and results rendered only when the response is received.
- **FR-012**: The availability results MUST be displayed as a table with columns: "Yard Name", "Location", and "Availability".
- **FR-013**: Each row in the availability table MUST show a green symbol alongside "Available" or a red symbol alongside "Occupied" in the Availability column.
- **FR-014**: The planner MUST be able to select one or more rows from the availability table using row-level checkboxes or multi-select interaction.

#### Phase 3 — Capacity Assessment

- **FR-015**: The capacity assessment section MUST only become active when at least one yard row is selected from the availability table.
- **FR-016**: The planner MUST be able to enter a free-text prompt providing additional context to the AI Capacity Planner before triggering the assessment.
- **FR-017**: Clicking "Assess Capacity" MUST trigger a call to the AI Capacity Planner backend stub endpoint (e.g., `POST /api/capacity-plan`). The stub MUST introduce a 10–20 second artificial delay before returning its hardcoded response.
- **FR-018**: While awaiting the AI Capacity Planner response, the system MUST display a continuously animated spinner (running process circle) in place of or adjacent to the "Assess Capacity" button. The button itself MUST be disabled for the duration. The spinner is dismissed and the plan table plus rationale are rendered only when the response is received.
- **FR-019**: The simulated response MUST return data in the augmented plan format: project ID, project name, duration (days), start date, end date, resource, dependencies, cost, and priority.
- **FR-020**: The augmented plan MUST be displayed as a table with all columns from the plan format.
- **FR-021**: A rationale text block MUST be displayed alongside the plan table, explaining the plan decisions. For this POC, the rationale is generated as synthetic content; in production it will come from the API response.
- **FR-022**: The plan table and rationale together constitute the "proposal" that the planner reviews before proceeding to the Gantt view.

#### Phase 4 — Interactive Gantt Chart

- **FR-023**: The Gantt chart MUST display both the human plan (sourced from the uploaded human plan CSV on the project details form) and the AI-augmented plan as superimposed, visually distinct bars on the same resource-time grid (extending the visualisation established in `001-ai-planning-assistant` FR-004).
- **FR-024**: The Gantt chart MUST render the plan data produced by the capacity assessment in the current session, not static hardcoded data (superseding `001-ai-planning-assistant` FR-004a).
- **FR-025**: A natural-language command input MUST be available on the Gantt page, allowing the planner to type a single-entity edit command (e.g., "change PRJ-F01 from JY-QA to JY-QB").
- **FR-025a**: On submission, the frontend MUST POST the raw command string to a backend rule-based parsing endpoint (e.g., `POST /api/plan-edit/parse`). The endpoint parses the command using server-side regex/rules and returns a structured edit action as JSON (e.g., `{"project_id": "PRJ-F01", "field": "resource", "from": "JY-QA", "to": "JY-QB"}`). No LLM call is made.
- **FR-026**: On receiving a valid structured edit action from the parsing endpoint, the system MUST apply the change to the underlying plan data and re-render the Gantt chart without a full page reload.
- **FR-027**: If the parsing endpoint returns an error or the command does not match any supported pattern, the system MUST display a clear error message (including the supported command format) and leave all plan data unchanged.
- **FR-028**: Gantt chart task bars MUST be draggable to different resource rows; dragging to a new row MUST update the resource field in the underlying plan data.
- **FR-029**: Gantt chart task bars MUST be draggable horizontally to shift dates; a horizontal drag MUST update the start date and end date in the underlying plan data while preserving duration.
- **FR-030**: Invalid drags (zero-duration result, invalid resource, out-of-range dates) MUST be rejected and the bar returned to its original position with a descriptive error message.
- **FR-031**: A "Download Chart" button MUST export the current Gantt chart as a raster image file (PNG or JPEG) to the user's device.
- **FR-032**: A "Download Data" button MUST export the current plan table as a CSV file to the user's device, reflecting all edits made in the session.
- **FR-033**: An "Undo" button MUST be available on the Gantt page. Clicking it reverses the single most recent edit (NL command or drag-drop). Only one level of undo is supported; the button is disabled when no edit has been made or after an undo has already been used since the last edit.

### Key Entities *(include if feature involves data)*

- **Project**: Extended entity from sprint `001`; now includes project type (confirmed/enquiry), hull dimensions (length, width, height), topside weight, preferred location, preferred yard, selected processes, and block breakdown notes.
- **ProjectReference**: The uploaded `project_ref.csv` file contents, stored against the project as historical planning data and reference context for the AI planners.
- **HumanPlan**: The uploaded human plan CSV, stored against the project; used exclusively as the baseline overlay on the Gantt chart. Structurally identical to the augmented plan format (project ID, project name, duration, start date, end date, resource, dependencies, cost, priority).
- **PlanningPreferences**: The structured preferences associated with a project: preferred location, preferred yard, processes to include, and block breakdown text.
- **YardAvailabilityResult**: The output of the AI/ML Planner call; a list of records each containing yard name, location, and availability status (available/occupied).
- **CapacityPlan**: The output of the AI Capacity Planner call; a list of plan rows each containing project ID, project name, duration (days), start date, end date, resource, dependencies, cost, and priority, plus an associated free-text rationale.
- **PlanEdit**: A record of a single modification made by the planner (either via natural-language command or drag-and-drop), capturing the original value, new value, affected field, and timestamp. The system retains only the most recent edit in memory to support single-step undo; prior edits are not recoverable within the session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A planner can complete the project details form and upload a reference file in under 3 minutes.
- **SC-002**: Yard availability results are displayed within 25 seconds of clicking "Generate Available Options" (accounting for the intentional 10–20 second simulated backend delay); the spinner is visible for the full wait duration.
- **SC-003**: The capacity assessment plan and rationale are displayed within 25 seconds of clicking "Assess Capacity" (accounting for the intentional 10–20 second simulated backend delay); the spinner is visible for the full wait duration.
- **SC-004**: A natural-language edit command round-trip (frontend POST → backend rule parse → frontend apply + re-render) completes in under 2 seconds of submission (rule-based parsing; no simulated delay applies to this endpoint).
- **SC-005**: A drag-and-drop edit is reflected in both the chart and the data table within 1 second of the planner releasing the drag.
- **SC-006**: 100% of mandatory form fields are validated before the "Generate Available Options" button becomes active; no incomplete submission reaches the backend.
- **SC-007**: The downloaded CSV exactly matches the current state of the plan table at the time of download (zero data discrepancy).
- **SC-008**: The downloaded Gantt chart image captures the full chart including all visible task bars, resource labels, and the timeline axis (no clipping of content within the visible chart area).
- **SC-009**: At least 90% of single-entity natural-language commands following the pattern "change [PROJECT-ID] from [RESOURCE-A] to [RESOURCE-B]" are correctly interpreted and applied.
- **SC-010**: The end-to-end workflow (form → availability → capacity plan → Gantt view) is completable in a single uninterrupted demo session of under 10 minutes.

## Assumptions

- **Simulated API responses**: Both the AI/ML Planner and the AI Capacity Planner are implemented as FastAPI backend stub endpoints that return hardcoded/synthetic JSON. Each stub introduces a 10–20 second `asyncio.sleep` delay to realistically simulate real API latency. The frontend calls these stubs identically to how it will call the real APIs, minimising rework when real integrations are wired in. The simulated availability data represents a realistic subset of Seatrium yards; the simulated capacity plan output mirrors the `ai_augmented_plan.csv` structure used in sprint `001`.
- **Rationale text**: The rationale text block displayed after capacity assessment is generated as synthetic content for this POC; the implementation should clearly note this is a placeholder for real API output. Representative rationale should reference the selected yards, planner's text prompt, hull dimensions, and chosen processes.
- **Single-entity NL edits**: Natural-language command parsing for this sprint supports single-entity changes only (one project ID per command, one field change per command). Parsing is implemented as a server-side rule-based FastAPI endpoint using regex; no LLM is involved. Supported pattern for MVP: "change [PROJECT-ID] from [RESOURCE-A] to [RESOURCE-B]". Multi-entity or unrecognised instructions are rejected by the endpoint with a descriptive error message including the supported format.
- **Reference file schema**: `project_ref.csv` is expected to contain at minimum project identifiers, resource assignments, and date ranges matching the augmented plan format. Unexpected extra columns are tolerated; missing required columns result in an upload warning.
- **Existing login and project creation unchanged**: User authentication (planner persona), the project list page, and the new-project creation modal (sprint `001-ui-login-projects`) remain untouched by this sprint.
- **Existing Gantt visualisation extended**: The Gantt chart component from sprint `001-ai-planning-assistant` is the starting point; this sprint adds interactivity (drag-drop, NL editing, download) and replaces the static data source with the live capacity plan output.
- **Session persistence**: Plan edits are persisted within the user's active browser session; on return to the Gantt page the last-saved plan state is restored. The previous plan state (pre-last-edit) is held in memory for single-step undo only; navigating away clears the undo buffer.
- **Yard list**: The set of yards shown in the Preferred Yard dropdown and the simulated availability table is fixed for this POC to the six named yards (Singapore - Tuas Boulevard, Singapore - Pioneer, JY-QA, JY-QB, JY-QC, JY-QD).
- **Download formats**: "Download Chart" produces a PNG or JPEG image. "Download Data" produces a CSV. PDF and other formats are post-MVP.

## Remaining Open Questions

- Should the "Enquiry" vs "Confirmed" project type influence which yards are shown in the simulated availability results (e.g., enquiry projects could show hypothetical future availability)?
- Is there a target list of natural-language command patterns beyond resource reassignment (e.g., date shifting, priority changes) that must be supported in this sprint?