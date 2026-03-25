# Seatrium AI Planner — Shipyard Scheduling & Replanning

AI-powered shipyard scheduling tool for Seatrium planners to visualize, manage, and replan vessel projects across Singapore yards.

## What it does

Planners already have schedules. They don't need AI to build from scratch — they need AI to **replan when things change**.

**Core flow**: Upload schedule → View project plan → Change parameters → AI replans with reasoning → Review & approve → Plan updates.

## Features

### Project Workspace
- **Project Details** — vessel info, status, timeline, cost at a glance
- **Phase Stepper** — visual timeline with numbered phases, dates, current phase highlighted
- **Project-specific Gantt** — color-coded bars per vessel with zoom controls (Fit/Year/Quarter/Month/Week)
- **Yard Capacity Heatmap** — collapsible overview of all yards with drill-down to Gantt view

### AI Replan (gpt-5.4-mini / o3)
- **Pre-filled config** — ChangePanel loads current project values from database
- **Change detection** — modify any field → amber highlight → "Changes Detected" summary
- **Streaming AI response** — real-time SSE streaming of AI reasoning
- **AI Proposal** — summary, per-task explanations, tradeoffs
- **Delta table** — before/after comparison for every changed row (red strikethrough → green)
- **Approval flow** — user reviews and explicitly approves before changes are applied
- **Persistence** — project config + plan rows saved to PostgreSQL on approve

### Data & Visualization
- **Realistic sample data** — 8 vessel projects (FPSO, LNG Carrier, Jack-Up Rig, Semi-Sub, Drillship, Pipe Layer, OSV, Repair) with 40 phases across 6 Singapore yard groups
- **Color-coded Gantt** — each vessel gets a distinct color with visible legend
- **Bar labels** — truncated with "…" to fit, full name on hover
- **Seatrium branding** — corporate header (#003EFF blue, Arial), white/clean design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | FastAPI + SQLAlchemy + Pydantic |
| Database | PostgreSQL (Docker locally, Azure Flexible Server in cloud) |
| AI | Azure OpenAI gpt-5.4-mini (streaming via SSE) |
| Auth | Azure Managed Identity (DefaultAzureCredential) |
| Infra | Azure Container Apps + Azure Database for PostgreSQL |
| IaC | Bicep via Azure Developer CLI (azd) |
| Design | Seatrium corporate branding |

## Quick Start

### Local Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure DATABASE_URL and AZURE_OPENAI_ENDPOINT

# Start PostgreSQL
docker run -d --name seatrium-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=seatrium -e POSTGRES_DB=seatrium -e POSTGRES_USER=seatrium \
  postgres:16

# Start backend
uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Docker Compose

```bash
cd docker
docker compose up --build
```

### Azure Deployment (azd)

```bash
azd init
azd env set AZURE_OPENAI_ENDPOINT "https://your-resource.cognitiveservices.azure.com/"
azd env set AZURE_OPENAI_RESOURCE_GROUP "your-rg"
azd env set AZURE_OPENAI_ACCOUNT_NAME "your-account"
azd up
```

## Testing

```bash
# API + data consistency + replan validation (32 tests)
python test_validate.py              # local
python test_validate.py --azure      # Azure deployment

# Demo recording (Playwright)
python demo_record.py
```

## Project Structure

```
├── azure.yaml              # azd service definitions
├── infra/                   # Bicep IaC (ACA + PostgreSQL + ACR)
├── docker/                  # Dockerfiles + nginx + compose
├── backend/
│   ├── src/
│   │   ├── main.py          # FastAPI app
│   │   ├── api/routes.py    # REST endpoints
│   │   ├── services/
│   │   │   ├── replan_service.py  # AI replan (streaming + non-streaming)
│   │   │   └── ...
│   │   └── models/          # SQLAlchemy + Pydantic schemas
│   └── tests/fixtures/      # Sample CSV data
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PlanWorkspacePage.tsx   # Main workspace (view + replan modes)
│   │   │   ├── ProjectLandingPage.tsx  # Project setup form
│   │   │   ├── ProjectsPage.tsx        # Home (projects + yard overview)
│   │   │   └── YardOverviewPage.tsx    # Global yard capacity
│   │   ├── components/
│   │   │   ├── GanttChart.tsx          # SVG Gantt with color-coding
│   │   │   ├── ChangePanel.tsx         # Replan sidebar with change detection
│   │   │   ├── AIReasoningPanel.tsx    # AI proposal display
│   │   │   └── YardSummaryDashboard.tsx # Heatmap
│   │   └── hooks/
│   │       ├── useGanttEdit.ts         # Plan edit state management
│   │       └── useAllPlanData.ts       # Cross-project data loading
│   └── nginx.conf
└── scripts/
    └── generate_sample_data.py
```
