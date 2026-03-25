# Quickstart: UI Login and Project Landing

## Goal

Verify the new login, project list, and project landing flow in the existing demo stack.

## Prerequisites

- Backend running at http://localhost:8000
- Frontend running at http://localhost:5173

## Demo Steps

1. Open the app in the browser and confirm the login page appears.
2. Select either persona (Planner or Admin) and continue to the project list.
3. Click **+ New project**, enter a project name in the modal, and confirm creation.
4. Click the project card to open the project landing page.
5. **Step 1 – Upload current plan**: upload a CSV file (columns: `project_id`, `resource`, `start_date`, `end_date`). Step 1 is marked done and Step 2 unlocks.
6. **Step 2 – Upload new project details**: upload any CSV file (processed client-side only; no backend call). Step 2 is marked done and Step 3 unlocks.
7. **Step 3 – Generate plan**: click the Generate button and wait for the AI progress bar to complete. On success, the app navigates automatically to the Gantt visualisation page.
8. On the Gantt page, review the Human Plan vs AI Augmented Plan side-by-side and click **← Back to project** to return.
9. To delete a project: from the project list, click the trash 🗑️ icon on a card, confirm in the dialog, and verify the card is removed.

## Expected Results

- Both personas route to the same project list.
- Project creation uses a modal and the new project appears immediately.
- An empty project list shows a "Create your first project" prompt.
- The 3-step workflow steps lock/unlock in sequence as each step is completed.
- Plan generation shows a progress bar and redirects to the Gantt page on completion.
- The Gantt page shows "Human Plan" and "AI Augmented Plan" badges side-by-side.
- Existing uploads and generated plans are listed below the workflow steps (hidden when empty).
- Project deletion requires confirmation and immediately refreshes the list.
