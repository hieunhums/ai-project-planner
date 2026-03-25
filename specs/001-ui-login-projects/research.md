# Research Decisions: UI Login and Project Landing

## Decision 1: Keep existing React router and add new routes

- Decision: Use React Router with new routes for login, project list, and project landing.
- Rationale: The app already uses React Router; extending it is low-risk and consistent with current navigation.
- Alternatives considered: Replace router or add a separate router layer (rejected as unnecessary for the demo scope).

## Decision 2: Use the existing FastAPI + SQLite stack and extend data model

- Decision: Add a Project entity and associate plans/uploads with a project via `project_id`.
- Rationale: The backend already persists plans in SQLite; adding a project table preserves the stack and enables project grouping.
- Alternatives considered: Store projects only in frontend state (rejected because uploads/plans must persist between sessions).

## Decision 3: Expose project summary endpoint with uploads and plans

- Decision: Provide a project detail endpoint returning uploads (human plans) and generated plans with name, timestamp, and status.
- Rationale: The UI needs a single call to populate the landing page without extra round trips.
- Alternatives considered: Separate endpoints for uploads and plans (rejected for additional UI complexity in the demo flow).

## Decision 4: Preserve existing upload flow and extend with project context

- Decision: Keep `/api/plans/upload` but include `project_id` as a form field and store the original filename.
- Rationale: Minimal change to existing upload logic while enabling project-scoped lists.
- Alternatives considered: Create a new upload endpoint (rejected to avoid duplicated logic).
