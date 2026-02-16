# Feature Specification: AI-Augmented Planning Assistant for Shipyard & Port Logistics

**Feature Branch**: `001-ai-planning-assistant`  
**Created**: February 16, 2026  
**Status**: In Clarification (5 clarifications resolved)  
**Input**: User description: "This demo web application is designed for shipyard and port planners at Seatrium to explore how AI can augment, not replace, human planning decisions for construction and port logistics..."

## Clarifications

### Session 2026-02-16

- Q: How should the system handle constraint conflicts? → A: Suggest optimal constraint relaxation (AI recommends minimum relaxations to achieve feasibility automatically)
- Q: What plan scale/complexity is expected for demo? → A: Small demo scale (10-50 tasks)
- Q: Which planning constraints should be prioritized? → A: Extended constraints (cost limits, facility capacity, multi-shift availability, resource skill matching)
- Q: Should the system support multi-project planning? → A: Single-project focus (one plan per upload session)
- Q: What optimization approach should the AI use? → A: Standard heuristic search (fast, good-enough solutions, simpler to explain)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Planning Data and Generate Initial AI Plan (Priority: P1)

Seatrium planners need to import their existing planning spreadsheets and generate an AI-proposed plan. This is the entry point to the system and enables the core value proposition of AI-assisted planning.

**Why this priority**: This is the critical MVP foundation—without the ability to load data and generate a plan, no other feature has value. It unblocks all downstream comparison and iteration workflows.

**Independent Test**: Can be fully tested by uploading a sample planning spreadsheet, confirming the AI generates a plan output with identified schedule dates, resource allocations, and capacity utilizations, and delivers immediate planning insights.

**Acceptance Scenarios**:

1. **Given** a planner has a spreadsheet with tasks, resources, dates, and constraints, **When** they upload the file, **Then** the system parses the data and confirms successful import with a summary of loaded records
2. **Given** valid planning data is uploaded, **When** the planner requests AI plan generation, **Then** the AI generates a feasible plan within reasonable time (seconds to ~1 minute)
3. **Given** planning data contains schedule, capacity, and resource constraint information, **When** the AI plan is generated, **Then** the plan accounts for all uploaded constraints
4. **Given** the AI generates a plan, **When** displayed, **Then** the plan shows task sequence, dates, assigned resources, and capacity utilization metrics

---

### User Story 2 - View Side-by-Side Comparison of AI Plan vs. Human Plan (Priority: P1)

Planners need to compare the AI-generated plan directly against their original plan to understand differences, trade-offs, and potential improvements.

**Why this priority**: This is the core decision-support feature. Without comparison, the AI plan is just another artifact. Comparison enables trust-building through transparency and reveals planning insights to the user.

**Independent Test**: Can be fully tested by comparing two plans side-by-side, verifying that differences are highlighted, trade-offs are visible (e.g., resource utilization vs. schedule acceleration), and potential improvements are identified with their impact metrics.

**Acceptance Scenarios**:

1. **Given** both an original (human) plan and an AI-generated plan exist, **When** displayed side-by-side, **Then** differences in task sequence, dates, and resource allocation are clearly highlighted
2. **Given** plans differ in outcomes, **When** differences are shown, **Then** the system quantifies trade-offs (e.g., "AI plan reduces schedule by 10% but increases a specific resource utilization from 60% to 85%")
3. **Given** the AI plan offers potential improvements, **When** viewing the comparison, **Then** improvements are explicitly called out (e.g., "Greater capacity utilization", "Lower risk hotspots", "Improved schedule feasibility")
4. **Given** comparison is displayed, **When** user reviews it, **Then** all data is presented in a clear, non-technical format suitable for planning stakeholders

---

### User Story 3 - Understand AI Reasoning and Assumptions (Priority: P1)

Planners need transparent explanations of key decisions made by the AI to build trust and understand the planning logic.

**Why this priority**: Transparency is essential for planners to trust and adopt the system. Without understanding *why* the AI made decisions, planners cannot confidently use or modify recommendations. This directly addresses the demo's goal of "explainable decision-support."

**Independent Test**: Can be fully tested by generating a plan, then confirming that explanations are provided for major decisions (e.g., why a task was scheduled earlier/later, why a resource was assigned, what assumptions drove the plan), and verifying explanations are clear and non-technical.

**Acceptance Scenarios**:

1. **Given** an AI plan is generated, **When** a planner selects a task or decision, **Then** they see an explanation of the reasoning (e.g., "Task A moved to Week 3 to prevent resource conflict with Task B")
2. **Given** the AI makes trade-offs, **When** viewed, **Then** the system explains the constraints or assumptions that led to that trade-off decision
3. **Given** a planner reviews the plan, **When** they examine resource allocations, **Then** they understand why each resource was assigned to specific tasks
4. **Given** the system uses default assumptions (e.g., priority weighting, risk tolerance), **When** the plan is presented, **Then** these assumptions are explicitly listed for planner review

---

### User Story 4 - Adjust Constraints and Re-Run AI Plan (Priority: P2)

Planners need to iteratively modify constraints or assumptions and regenerate plans to explore "what-if" scenarios without leaving the system.

**Why this priority**: This is essential for the iterative planning workflow and explores the full value of AI as a decision partner. While not part of the initial MVP, this feature accelerates planning analysis and insight discovery.

**Independent Test**: Can be fully tested by modifying a constraint (e.g., resource availability, deadline, capacity limits), re-running the AI, confirming a new plan is generated, and verifying differences reflect the constraint change.

**Acceptance Scenarios**:

1. **Given** an initial plan exists, **When** a planner modifies a constraint (e.g., reduces available capacity for a resource), **Then** the system accepts the change and allows plan regeneration
2. **Given** a constraint is modified, **When** the planner requests a new plan, **Then** the AI regenerates the plan reflecting the new constraint
3. **Given** multiple plan versions exist, **When** displayed, **Then** the planner can compare any two versions to see the impact of constraint changes
4. **Given** a planner changes assumptions (e.g., priority weights, risk tolerance), **When** a new plan is generated, **Then** the plan reflects these preference changes

---

### User Story 5 - Accept, Reject, or Modify AI Recommendations (Priority: P2)

Planners must retain full control to selectively adopt AI recommendations or create hybrid plans combining human and AI decisions.

**Why this priority**: This ensures "human-in-the-loop" decision-making. Planners must be able to override the AI and implement their preferred approach, maintaining their authority and control.

**Independent Test**: Can be fully tested by selecting individual recommendations to accept or reject, modifying a plan element, and confirming the system tracks accepted and rejected recommendations while allowing plan export.

**Acceptance Scenarios**:

1. **Given** an AI plan is presented, **When** a planner reviews recommendations, **Then** they can select individual recommendations to accept, reject, or defer
2. **Given** a planner accepts some recommendations and rejects others, **When** they create a final plan, **Then** the system combines accepted recommendations with the planner's preferred changes
3. **Given** a final plan is created, **When** displayed, **Then** it clearly indicates which elements came from AI, human decisions, or hybrid choices
4. **Given** a planner has finalized their plan, **When** they export it, **Then** the system exports a clear, actionable plan suitable for execution teams

---

### Edge Cases

- What happens when uploaded data is incomplete or contains inconsistencies (missing dates, unspecified resources)?
- How does the system handle constraint conflicts (e.g., impossible deadlines, insufficient resources to meet all goals)?
- What occurs if the AI cannot generate a feasible plan given current constraints?
- How does the system behave when a planner uploads very large planning datasets (100s of tasks, complex dependencies)?
- What happens if a planner uploads data in an unsupported format?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept planning data uploads in common spreadsheet formats (CSV, Excel) containing tasks, resources, dates, durations, dependencies, and constraints
- **FR-002**: System MUST parse uploaded data and validate structure, identifying missing or anomalous entries with clear user feedback
- **FR-003**: System MUST generate an AI-proposed plan that respects schedule, capacity, and resource constraints within a configurable time limit
- **FR-004**: System MUST display the original (human) plan and AI-generated plan in a comparable format side-by-side
- **FR-005**: System MUST highlight differences between plans including task sequence changes, date shifts, and resource re-allocations
- **FR-006**: System MUST quantify trade-offs (e.g., "reduces schedule by X days" or "increases resource utilization by Y%")
- **FR-007**: System MUST identify and display potential improvements (e.g., capacity utilization gains, risk hotspot reductions, schedule feasibility improvements)
- **FR-008**: System MUST provide transparent explanations for major AI decisions (e.g., why tasks were rescheduled, why resources were reassigned)
- **FR-009**: System MUST document and display all assumptions used by the AI in plan generation
- **FR-010**: System MUST allow planners to modify constraints or assumptions and re-generate plans iteratively
- **FR-011**: System MUST allow planners to accept, reject, or modify individual AI recommendations
- **FR-012**: System MUST enable planners to export finalized plans in formats suitable for execution (e.g., Gantt chart, task list, resource schedule)
- **FR-013**: System MUST track which plan elements are AI-generated, human-created, or hybrid, and maintain visibility of this lineage
- **FR-014**: System MUST handle constraint conflicts by automatically suggesting optimal constraint relaxations to achieve feasibility; user reviews and approves/rejects the relaxation proposal
- **FR-015**: System MUST process plans with up to 50 tasks for the MVP demo phase
- **FR-016**: System MUST support the following constraint types: task dependencies, resource availability, task deadlines, cost limits, facility capacity, multi-shift resource availability, and resource skill matching
- **FR-017**: System MUST focus on single-project planning scenarios; multi-project support is deferred to post-MVP enhancement
- **FR-018**: System MUST use a standard heuristic search approach for plan optimization balancing speed and explanation clarity

### Key Entities *(include if feature involves data)*

- **Task**: Represents a planning unit with attributes: task ID, name, duration, scheduled/actual dates, resource requirements, dependencies, constraints, and priority
- **Resource**: Represents an asset (equipment, personnel, facility) with attributes: resource ID, type, capacity, availability window, cost, and allocation status across tasks
- **Plan**: Represents a complete planning solution with attributes: plan ID, creation timestamp, task sequence, resource allocations, total duration, capacity utilization, and metadata
- **Constraint**: Represents a planning restriction with attributes: constraint type (deadline, capacity limit, resource availability), affected scope, and priority level
- **Assumption**: Represents an explicit assumption made during plan generation (e.g., priority weighting, risk tolerance, slack allocation strategy)
- **Recommendation**: Represents an AI suggestion for plan improvement with attributes: recommendation ID, type, affected task(s)/resource(s), rationale, and impact metrics

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Planners can upload planning data and generate an initial AI plan within 2 minutes total
- **SC-002**: The AI-proposed plan respects all uploaded constraints (100% constraint compliance in initial generation)
- **SC-003**: Side-by-side comparison clearly highlights at least 95% of plan differences (as objectively determinable—task date changes, resource reassignments, sequence modifications)
- **SC-004**: AI provides explicit explanations for at least 80% of significant differences between the original plan and AI plan (where significance is determined by impact on schedule, resource utilization, or risk)
- **SC-005**: Planners successfully identify and understand at least 90% of key trade-offs in the comparison without requiring external documentation
- **SC-006**: System executes iterative plan regeneration (constraint modification → re-run) in under 30 seconds per iteration
- **SC-007**: At least 80% of planners (in demo testing) report increased confidence in planning decisions after using the comparison feature
- **SC-008**: Planners can export a finalized plan ready for execution teams (in proper Gantt/task list format) in under 1 minute
- **SC-009**: The AI plan, on average, identifies potential improvements (capacity utilization, schedule acceleration, or risk reduction) in at least 70% of test scenarios
- **SC-010**: For plans with up to 50 tasks (target demo scale), plan generation completes within 1 minute without degradation in explanation quality or recommendation accuracy
- **SC-011**: System successfully identifies and recommends constraint relaxations in 100% of infeasible scenarios; relaxations reduce task count or deadline pressure by measurable amount
- **SC-012**: Planners accept constraint relaxation recommendations in at least 70% of cases where they are presented

## Assumptions

- **Uploaded data structure**: Planning spreadsheets follow a common format with clearly identifiable columns for tasks, resources, dates, durations, and constraints
- **Constraint feasibility**: Most uploaded plans have feasible solutions given current constraints; the AI will not be tested extensively on impossible scenarios in this demo
- **User technical level**: Planners are familiar with basic planning concepts (tasks, resources, scheduling) but are not required to understand technical AI/optimization details
- **Data quality**: Uploaded data is relatively clean; the system will handle minor anomalies but not extensive data cleansing
- **Planning domain scope**: The demo focuses on construction and port logistics planning; other planning domains may require customization
- **Scale for MVP**: Initial target is plans with 10–50 tasks; this scope ensures fast plan generation (< 1 minute) while demonstrating meaningful optimization value
- **Explanation granularity**: AI explanations will focus on major decisions (task rescheduling, high-impact resource allocations, constraint relaxations) rather than minute-by-minute reasoning
- **Constraint types in scope**: Task dependencies, resource availability, task deadlines, cost limits, facility capacity, multi-shift resource availability, and resource skill matching
- **Project scope**: Single-project planning per session; multi-project optimization is a future enhancement
- **Optimization strategy**: Heuristic search approach prioritizing feasibility and speed with clear explainability over mathematical optimality
- **Human-in-the-loop governance**: The system supports decision-support only; no automated plan execution occurs without explicit planner approval

## Remaining Open Questions

- What specific "improvement" metrics are most valuable to Seatrium (e.g., capacity utilization % gain, schedule compression days, risk score reduction)?
- What data format/schema will Seatrium's planning spreadsheets use? (Required for data parsing implementation)
- Should the system support data import from other planning tools (e.g., MS Project, Smartsheet) or focus on spreadsheet uploads for MVP?
