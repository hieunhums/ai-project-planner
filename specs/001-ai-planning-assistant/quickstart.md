# Quickstart: AI Planning Assistant (Local Demo)

## Prerequisites

- Python 3.11+
- Node.js 20+
- Azure OpenAI credentials (optional, mock mode works without them)

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Update .env with Azure OpenAI settings if available
python src/main.py
```

Backend runs at http://localhost:8000

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at http://localhost:5173

## Demo Flow

1. Open http://localhost:5173 \u2014 the login page appears.
2. Select **Planner** or **Admin** persona to enter the workspace.
3. On the Projects page, click **+ New project**, enter a name, and confirm creation.
4. Click the project card to open the project landing page (3-step workflow).
5. **Step 1**: Click the file drop zone and upload a current plan CSV (columns: `project_id`, `resource`, `start_date`, `end_date`). Use a fixture from `backend/tests/fixtures/` as a sample. Step 1 is marked done when the backend confirms parse results (task and resource counts shown).
6. **Step 2**: Click to select any CSV file as the new project details. This step is processed client-side only (no backend call). Step 2 is marked done immediately after selection.
7. **Step 3**: Click **✦ Generate new project optimisation plan**. A progress bar shows AI reasoning in progress. On completion, the app navigates to the Gantt page.
8. Review the Gantt visualisation: horizontal resource-lane chart with **Human Plan** (blue) and **AI Augmented Plan** (gold) bars for quay resources JY-QA through JY-QG, Jan 2026–Apr 2029.
9. Click **← Back to project** to return to the landing page and see the new plan listed under Generated Plans.
10. *(Optional)* Navigate to `/compare?human=<humanPlanId>&ai=<aiPlanId>` for structured difference analysis, trade-off metrics, and recommendation controls.
11. *(Optional)* Navigate to `/iterate` and enter a Base Plan ID to edit constraints and regenerate a variant plan.
12. *(Optional)* From the Compare page, use **Export** to download the plan as CSV, JSON, or Gantt JSON.

## Reset Demo Data

- Stop the backend.
- Delete the SQLite database file (see `backend/src/config.py` for path).
- Clear `backend/uploads/`.
