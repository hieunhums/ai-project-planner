# Feature Specification: UI Login and Project Landing

**Feature Branch**: `001-ui-login-projects`  
**Created**: February 16, 2026  
**Status**: Implemented  
**Input**: User description: "UI look and feel: login personas, project list, project landing shows existing uploads/plans"

## Clarifications

### Session 2026-02-16

- Q: Should persona logins share or separate project data? → A: Shared project list and artifacts for both personas.
- Q: How should new project creation be presented? → A: Use a modal on the project list page.
- Q: How should empty states be displayed? → A: Hide empty sections until content exists.
- Q: What metadata should be shown in uploads and plans lists? → A: Name, timestamp, and a short status label.
- Q: How should a project be opened from the list? → A: Clicking a project card opens the project landing page directly.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Persona Login Entry (Priority: P1)

As a demo user, I want to land on a login page that lets me choose Planner or Admin so I can enter the app quickly with the right persona.

**Why this priority**: This is the first interaction and is required to access any project features.

**Independent Test**: Can be fully tested by selecting each persona and confirming arrival at the post-login project list.

**Acceptance Scenarios**:

1. **Given** I am on the login page, **When** I select Planner, **Then** I reach the project list page.
2. **Given** I am on the login page, **When** I select Admin, **Then** I reach the project list page.

---

### User Story 2 - View and Create Projects (Priority: P2)

As a user, I want to see existing projects or create a new one via a plus sign so I can start or continue work.

**Why this priority**: This is the primary navigation hub after login and enables entry into any project.

**Independent Test**: Can be fully tested by viewing the list and creating a new project without visiting any other page.

**Acceptance Scenarios**:

1. **Given** I have existing projects, **When** I reach the project list page, **Then** I can see those projects listed.
2. **Given** I am on the project list page, **When** I use the plus sign to create a project and provide a name, **Then** the new project appears in the list.

---

### User Story 3 - Project Landing 3-Step Workflow (Priority: P3)

As a user, I want the project landing page to guide me through a step-by-step workflow — upload the current plan, load new project details, and generate an optimised AI plan — with locked steps that only activate once prior steps are complete.

**Why this priority**: The 3-step workflow is the core productive action within a project; it surfaces prior work and prevents redundant uploads while guiding the planner to generate a new AI plan.

**Independent Test**: Can be fully tested by completing each step in sequence and confirming that each step's state (active / done / locked) updates as expected, and that plan generation navigates to the Gantt visualisation.

**Acceptance Scenarios**:

1. **Given** I am on the project landing page, **When** I upload a CSV with valid plan data, **Then** Step 1 is marked done and Step 2 becomes active.
2. **Given** Step 1 is done, **When** I upload a new project details CSV, **Then** Step 2 is marked done and Step 3 becomes active.
3. **Given** Steps 1 and 2 are done, **When** I click Generate, **Then** the AI generates a plan and I am redirected to the Gantt visualisation page.
4. **Given** a project has existing uploaded files, **When** I enter the project, **Then** the uploads list is shown below the workflow steps.
5. **Given** a project has existing generated plans, **When** I enter the project, **Then** the generated plans list is shown below the workflow steps.
6. **Given** a project has no uploads or plans, **When** I enter the project, **Then** the uploads and plans sections are hidden.

---

### User Story 4 - Project Deletion (Priority: P3)

As a user, I want to delete a project from the project list via a trash icon with a confirmation prompt so I can keep the workspace tidy.

**Why this priority**: Deletion is a clean-up utility that prevents accumulation of demo artifacts without being on the critical path for planning work.

**Independent Test**: Can be fully tested by clicking the trash icon on any project card, confirming or cancelling the dialog, and verifying the project list updates accordingly.

**Acceptance Scenarios**:

1. **Given** I am on the project list, **When** I click the trash icon on a project card, **Then** a confirmation dialog appears.
2. **Given** the confirmation dialog is shown, **When** I confirm deletion, **Then** the project is removed from the list.
3. **Given** the confirmation dialog is shown, **When** I cancel, **Then** no deletion occurs and the project remains.

---

### Edge Cases

- What happens when there are no projects yet after login? → Empty state with a "Create your first project" call-to-action is shown.
- How does the system handle a project with zero uploads and zero generated plans? → Uploads and plans sections are hidden; the 3-step workflow is the only visible content.
- What happens when a user tries to create a project without a name? → The create button remains disabled / form validation prevents submission.
- What happens if a step in the workflow is attempted out of order? → Steps 2 and 3 are locked until prior steps are completed.
- What if plan generation fails? → An error message banner is shown on the landing page and the user remains on the landing page.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST present a login page with exactly two persona options: Planner and Admin.
- **FR-002**: System MUST route both personas to the same post-login project list page.
- **FR-002a**: System MUST present the same project list, uploads, and generated plans for both personas.
- **FR-003**: System MUST display all existing projects on the project list page.
- **FR-004**: System MUST allow users to create a new project using a plus sign affordance.
- **FR-005**: System MUST require a project name to complete creation.
- **FR-005a**: System MUST create new projects using a modal on the project list page.
- **FR-005b**: System MUST open a project by clicking its card, navigating directly to the project landing page.
- **FR-006**: System MUST direct users entering a project to a 3-step workflow landing view: (1) upload current plan, (2) upload new project details, (3) generate optimised plan.
- **FR-006a**: Steps 2 and 3 of the workflow MUST remain locked until the preceding step is completed.
- **FR-006b**: Step 3 (Generate) MUST display a progress indicator while the AI plan is being generated.
- **FR-006c**: On successful plan generation, the system MUST navigate the user to the Gantt visualisation page for the current project (`/projects/:projectId/gantt`).
- **FR-006d**: Step 2 (new project details upload) is a local-only demo step; the file is accepted client-side and no backend upload is performed.
- **FR-007**: System MUST show the list of uploaded files for the selected project below the workflow steps.
- **FR-008**: System MUST show the list of generated plans for the selected project below the workflow steps.
- **FR-008a**: Uploads and plans lists MUST show name, timestamp, and a short status label for each item.
- **FR-009**: System MUST hide the uploads and plans sections when no items exist for a project.
- **FR-010**: Users MUST be able to proceed with upload and generation actions from the landing view without rerunning prior work.
- **FR-011**: System MUST provide a Gantt visualisation page (`/projects/:projectId/gantt`) that displays the human plan and the AI-augmented plan side-by-side with distinguishing badges.
- **FR-012**: System MUST allow users to delete a project from the project list using a trash icon button on each project card.
- **FR-012a**: Deletion MUST require confirmation via a dialog before the project is removed.
- **FR-012b**: The project list MUST refresh immediately after a successful deletion.
- **FR-013**: The project list page MUST show an empty-state prompt with a "Create your first project" call-to-action when no projects exist.

### Assumptions

- Persona selection is a demo-only login with no credentials.
- Project creation requires only a name and immediately adds the project to the list.
- Uploaded files and generated plans are associated with a single project and persist between sessions.
- Out of scope: role-based permissions, project deletion, and non-demo authentication methods.

### Key Entities *(include if feature involves data)*

- **Persona Session**: The selected demo persona for the current session (Planner or Admin), stored in browser session storage.
- **Project**: A named workspace that groups uploads and generated plans, persisted in the backend database.
- **Uploaded File**: A CSV file previously uploaded within a project (columns: project_id, resource, start_date, end_date), with name and upload time.
- **New Project Details File**: A CSV loaded client-side only (Step 2, mocked); not persisted to backend.
- **Generated Plan**: An AI-optimised plan produced for a project, with name and generation time.
- **Gantt Entry**: A scheduled task/resource row rendered on the Gantt visualisation page, showing project, resource, date range, and priority.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% of users can reach the project list within 30 seconds of the login page on their first attempt.
- **SC-002**: 90% of users can create a new project and see it listed within 60 seconds.
- **SC-003**: Users complete the 3-step upload-and-generate workflow and arrive at the Gantt visualisation within 5 minutes on first attempt.
- **SC-004**: 90% of demo users rate the login-to-project flow as clear or very clear.
- **SC-005**: The Gantt visualisation page loads and renders within 2 seconds of navigation.
- **SC-006**: Project deletion including confirmation completes within 5 seconds and the list refreshes immediately.
