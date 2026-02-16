# Quickstart: UI Login and Project Landing

## Goal

Verify the new login, project list, and project landing flow in the existing demo stack.

## Prerequisites

- Backend running at http://localhost:8000
- Frontend running at http://localhost:5173

## Demo Steps

1. Open the app in the browser and confirm the login page appears.
2. Select either persona (Planner or Admin) and continue to the project list.
3. Click the plus button, enter a project name, and create the project.
4. Click the project card to open the project landing page.
5. Upload a planning file and confirm the upload appears in the uploads list.
6. Generate an AI plan and confirm it appears in the generated plans list.

## Expected Results

- Both personas route to the same project list.
- Project creation uses a modal and the new project appears immediately.
- The project landing page shows existing uploads and plans with name, timestamp, and status label.
- Uploads and plans sections are hidden when empty.
