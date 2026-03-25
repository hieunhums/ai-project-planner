# Backend - FastAPI Server

This directory contains the FastAPI backend server for the AI Project Planner.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

## Setup

1. **Create a virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   ```

2. **Activate the virtual environment**:
   ```bash
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

### Development Mode (with auto-reload)

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once the server is running, you can access:

- **Interactive API docs (Swagger UI)**: http://localhost:8000/docs
- **Alternative API docs (ReDoc)**: http://localhost:8000/redoc

## Environment Variables

Create a `.env` file in the backend directory if environment-specific configuration is needed.

## Stopping the Server

Press `Ctrl + C` in the terminal to stop the server.

## Deactivating Virtual Environment

```bash
deactivate
```