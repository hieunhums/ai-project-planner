# Feature Specification: UI Login and Project Landing

**Feature Branch**: `001-ui-login-projects`  
**Created**: February 16, 2026  
**Status**: Draft  
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

### User Story 3 - Project Landing With Existing Artifacts (Priority: P3)

As a user, I want the project page to land on the upload and generate view with existing uploads and generated plans shown so I can avoid rerunning work unless needed.

**Why this priority**: It prevents redundant work and makes project status immediately visible.

**Independent Test**: Can be fully tested by entering a project that has prior uploads and plans and verifying they display without rerunning tasks.

**Acceptance Scenarios**:

1. **Given** a project has uploaded files and generated plans, **When** I enter the project, **Then** I see both lists on the upload and generate page.
2. **Given** a project has no uploads or plans, **When** I enter the project, **Then** the uploads and plans sections are hidden while the upload and generate actions remain available.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- What happens when there are no projects yet after login?
- How does the system handle a project with zero uploads and zero generated plans?
- What happens when a user tries to create a project without a name?

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
- **FR-006**: System MUST direct users entering a project to the upload and generate page as the landing view.
- **FR-007**: System MUST show the list of uploaded files for the selected project on the landing view.
- **FR-008**: System MUST show the list of generated plans for the selected project on the landing view.
- **FR-008a**: Uploads and plans lists MUST show name, timestamp, and a short status label for each item.
- **FR-009**: System MUST hide the uploads and plans sections when no items exist for a project.
- **FR-010**: Users MUST be able to proceed with upload and generation actions from the landing view without rerunning prior work.

### Assumptions

- Persona selection is a demo-only login with no credentials.
- Project creation requires only a name and immediately adds the project to the list.
- Uploaded files and generated plans are associated with a single project and persist between sessions.
- Out of scope: role-based permissions, project deletion, and non-demo authentication methods.

### Key Entities *(include if feature involves data)*

- **Persona Session**: The selected demo persona for the current session (Planner or Admin).
- **Project**: A named workspace that groups uploads and generated plans.
- **Uploaded File**: A file previously uploaded within a project, with name and upload time.
- **Generated Plan**: A plan produced for a project, with name and generation time.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% of users can reach the project list within 30 seconds of the login page on their first attempt.
- **SC-002**: 90% of users can create a new project and see it listed within 60 seconds.
- **SC-003**: Users can view existing uploads and plans within 20 seconds of entering a project without rerunning tasks.
- **SC-004**: 90% of demo users rate the login-to-project flow as clear or very clear.
