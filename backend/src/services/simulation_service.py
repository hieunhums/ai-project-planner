"""
simulation_service.py
Stub simulation helpers that introduce realistic delays to mimic Azure AI agent
calls. These functions are intentionally not connected to any AI backend.
"""

from __future__ import annotations

import asyncio
import csv
import random
from pathlib import Path

# ---------------------------------------------------------------------------
# Yard Availability — US2
# ---------------------------------------------------------------------------

YARDS = [
    {
        "yard_name": "Singapore - Tuas Boulevard",
        "location": "Tuas, Singapore",
        "availability": "Available",
    },
    {
        "yard_name": "Singapore - Pioneer",
        "location": "Pioneer, Singapore",
        "availability": "Occupied",
    },
    {
        "yard_name": "Singapore - Admiralty",
        "location": "Admiralty, Singapore",
        "availability": "Occupied",
    },
    {
        "yard_name": "Singapore - Benoi",
        "location": "Benoi, Singapore",
        "availability": "Available",
    },
    {
        "yard_name": "Singapore - Tuas",
        "location": "Tuas, Singapore",
        "availability": "Occupied",
    },
]


async def simulate_yard_availability() -> list[dict]:
    """Return six hardcoded yards after a simulated 10–20 s delay."""
    await asyncio.sleep(random.uniform(10, 20))
    return YARDS


# ---------------------------------------------------------------------------
# Capacity Plan — US3
# ---------------------------------------------------------------------------

_FIXTURE_PATH = (
    Path(__file__).parent.parent.parent
    / "tests"
    / "fixtures"
    / "sample_plans"
    / "ai_augmented_plan.csv"
)


def _load_fixture_plan() -> list[dict]:
    rows: list[dict] = []
    with open(_FIXTURE_PATH, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rows.append(
                {
                    "project_id": row.get("project_id", ""),
                    "project_name": row.get("project_name", ""),
                    "duration_days": int(row.get("duration_days", 0)),
                    "start_date": row.get("start_date", ""),
                    "end_date": row.get("end_date", ""),
                    "resource": row.get("resource", ""),
                    "dependencies": row.get("dependencies", ""),
                    "cost": row.get("cost", ""),
                    "priority": row.get("priority", ""),
                }
            )
    return rows


async def simulate_capacity_plan(selected_yards: list[str], prompt: str) -> dict:
    """Return the fixture plan rows and a synthetic rationale after a delay."""
    await asyncio.sleep(random.uniform(10, 20))
    rows = _load_fixture_plan()
    rationale = (
        f"Based on the availability of {len(selected_yards)} selected yard(s) "
        f"({', '.join(selected_yards[:3])}{'…' if len(selected_yards) > 3 else ''}) "
        f"and the planner instruction '{prompt}', the AI has allocated "
        f"{len(rows)} tasks across the available resources. Critical path tasks "
        f"have been prioritised to minimise total project duration."
    )
    return {"plan": rows, "rationale": rationale}
