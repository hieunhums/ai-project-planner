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

1. Upload a sample CSV from `backend/tests/fixtures/sample_plans/`.
2. Generate an AI plan.
3. Compare AI vs human plans at `/compare`.
4. Review explanations and recommendations.
5. Export a plan from the comparison view.

## Reset Demo Data

- Stop the backend.
- Delete the SQLite database file (see `backend/src/config.py`).
- Clear `backend/uploads/`.
