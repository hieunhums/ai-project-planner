# AI-Augmented Planning Assistant for Shipyard & Port Logistics

Demo web application designed for Seatrium planners to explore how AI can augment human planning decisions for construction and port logistics.

## Features

- 📊 **Upload Planning Data**: Import existing planning spreadsheets (CSV/Excel)
- 🤖 **AI Plan Generation**: Generate optimized plans using Azure OpenAI reasoning models
- 🔍 **Side-by-Side Comparison**: Compare AI plans with human-generated plans
- 💡 **Explainable AI**: Transparent reasoning and assumptions behind AI decisions
- ⚙️ **Constraint Iteration**: Modify constraints and regenerate plans (what-if analysis)
- ✅ **Human-in-the-Loop**: Accept, reject, or modify AI recommendations
- 📤 **Export Plans**: Export finalized plans for execution teams

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **AI**: Azure OpenAI via Azure AI Foundry SDK
- **Orchestration**: Microsoft Agent Framework
- **Database**: SQLite (local)
- **Data Processing**: pandas, openpyxl

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: TanStack Query
- **Visualization**: Recharts

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- Azure OpenAI API access

### 1. Backend Setup

```bash
cd backend

# Create virtualenvironment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Azure OpenAI credentials

# Run backend
python src/main.py
# Server runs at http://localhost:8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run frontend
npm run dev
# App runs at http://localhost:5173
```

### 3. Test with Sample Data

Sample planning CSV files are available in `backend/tests/fixtures/sample_plans/`:
- `shipyard_construction_plan.csv` - 20-task shipyard project
- `resource_availability.csv` - Resource catalog
- `constraints.csv` - Project constraints
- `port_operations_human_plan.csv` - Port operations baseline

## Local-First Data Handling

- Uploads are stored locally in `backend/uploads/` and never sent to external storage.
- The SQLite database file is created locally (see `backend/src/config.py` for the path).
- To reset demo data, stop the backend, delete the SQLite file, and clear `backend/uploads/`.

## Docker (Optional)

```bash
# Build and run all services
docker-compose -f docker/docker-compose.yml up

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
```

## Project Structure

```
ai-project-planner/
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── api/            # API routes
│   │   ├── services/       # Business logic
│   │   ├── agents/         # Agent Framework integration
│   │   ├── models/         # Database models
│   │   └── main.py         # Entry point
│   └── tests/              # Backend tests
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   └── hooks/          # Custom hooks
│   └── tests/              # Frontend tests
├── docker/                  # Docker configuration
├── infra/                   # Azure deployment (Bicep)
└── specs/                   # Feature specifications
```

## Development Workflow

Phase implementation is tracked in `specs/001-ai-planning-assistant/tasks.md`:

- ✅ **Phase 0**: Research & Technical Decisions
- ✅ **Phase 1**: Setup (Shared Infrastructure)
- ✅ **Phase 2**: Foundational (Blocking Prerequisites)
- ✅ **Phase 3**: User Story 1 - Upload & Generate Plan
- ✅ **Phase 4**: User Story 2 - Side-by-Side Comparison
- ✅ **Phase 5**: User Story 3 - AI Reasoning & Assumptions
- ✅ **Phase 6**: User Story 4 - Constraint Iteration
- ✅ **Phase 7**: User Story 5 - Recommendation Control & Export

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Performance Expectations

- **Plan generation**: 3-5 minutes for 10-50 task plans (Azure OpenAI reasoning models)
- **UI responsiveness**: < 200ms for plan comparison rendering
- **Data upload**: < 30 seconds for typical spreadsheets (< 1MB)

## Contributing

This is a demo project for Seatrium. For questions or contributions, contact the development team.

## License

Proprietary - Seatrium © 2026
