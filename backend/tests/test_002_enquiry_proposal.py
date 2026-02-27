"""
Sprint-002 API tests: Enquiry-to-Proposal workflow

Covers the five Sprint-002 endpoints:
  POST /api/projects/{id}/details
  POST /api/projects/{id}/yard-availability
  POST /api/projects/{id}/capacity-plan
  POST /api/projects/{id}/plan-edit/parse
  PUT  /api/projects/{id}/plan
"""

from __future__ import annotations

import importlib
import io
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Shared fixture helpers
# ---------------------------------------------------------------------------


def _configure_test_environment(tmp_path: Path) -> None:
    os.environ["APP_ENV"] = "test"
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path / 'test.db'}"
    os.environ["UPLOAD_DIR"] = str(tmp_path / "uploads")
    os.environ["AZURE_OPENAI_ENDPOINT"] = ""
    os.environ["AZURE_OPENAI_API_KEY"] = ""


@pytest.fixture()
def client(tmp_path):
    backend_dir = Path(__file__).resolve().parents[1]
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    _configure_test_environment(tmp_path)

    config = importlib.import_module("src.config")
    config.get_settings.cache_clear()

    db_mod = importlib.import_module("src.db")
    importlib.reload(db_mod)

    main = importlib.import_module("src.main")
    importlib.reload(main)

    with TestClient(main.app) as tc:
        yield tc


def _create_project(client: TestClient, name: str = "Test Project") -> int:
    resp = client.post("/api/projects", json={"name": name})
    assert resp.status_code == 201
    return resp.json()["id"]


def _make_csv_bytes(with_all_columns: bool = True) -> bytes:
    if with_all_columns:
        header = (
            "project_id,project_name,duration_days,start_date,end_date,"
            "resource,dependencies,cost,priority"
        )
        row = "PRJ-001,Hull Assembly,10,2026-03-01,2026-03-11,JY-QA,,50000,High"
    else:
        # Missing several required columns
        header = "task_id,task_name,duration"
        row = "T001,Something,5"
    return f"{header}\n{row}\n".encode()


def _details_multipart(
    project_ref_bytes: bytes,
    human_plan_bytes: bytes,
    project_ref_fname: str = "ref.csv",
    human_plan_fname: str = "human.csv",
) -> tuple[dict, dict]:
    """Return (data_fields, files) suitable for TestClient.post(data=..., files=...)."""
    data = {
        "project_type": "confirmed",
        "project_name": "Offshore Rig A",
        "start_date": "2026-03-01",
        "end_date": "2027-03-01",
        "hull_length": "250.0",
        "hull_width": "50.0",
        "hull_height": "30.0",
        "topside_weight": "5000.0",
        "preferred_location": "Singapore",
        "preferred_yard": "JY-QA",
        "processes": '["Fabrication","Assembly"]',
        "block_breakdown": "12 blocks",
    }
    files = {
        "project_ref": (project_ref_fname, io.BytesIO(project_ref_bytes), "text/csv"),
        "human_plan": (human_plan_fname, io.BytesIO(human_plan_bytes), "text/csv"),
    }
    return data, files


# ===========================================================================
# Tests: POST /{project_id}/details
# ===========================================================================


class TestSaveProjectDetails:
    def test_success_returns_200_and_project_id(self, client: TestClient):
        pid = _create_project(client)
        data, files = _details_multipart(_make_csv_bytes(), _make_csv_bytes())
        resp = client.post(f"/api/projects/{pid}/details", data=data, files=files)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == pid
        assert body["name"] == "Offshore Rig A"
        assert body["project_type"] == "confirmed"

    def test_missing_csv_columns_returns_warnings(self, client: TestClient):
        pid = _create_project(client)
        bad_csv = _make_csv_bytes(with_all_columns=False)
        data, files = _details_multipart(bad_csv, bad_csv)
        resp = client.post(f"/api/projects/{pid}/details", data=data, files=files)
        assert resp.status_code == 200
        body = resp.json()
        # Both files are missing required columns — expect 2 warning entries
        assert len(body["warnings"]) == 2
        assert any("Missing required columns" in w for w in body["warnings"])

    def test_non_csv_file_returns_422(self, client: TestClient):
        pid = _create_project(client)
        data, files = _details_multipart(
            _make_csv_bytes(),
            b"<html>not csv</html>",
            human_plan_fname="plan.html",
        )
        resp = client.post(f"/api/projects/{pid}/details", data=data, files=files)
        assert resp.status_code == 422

    def test_unknown_project_returns_404(self, client: TestClient):
        data, files = _details_multipart(_make_csv_bytes(), _make_csv_bytes())
        resp = client.post("/api/projects/99999/details", data=data, files=files)
        assert resp.status_code == 404


# ===========================================================================
# Tests: POST /{project_id}/plan-edit/parse
# ===========================================================================


class TestParseNLEdit:
    def test_valid_command_returns_action(self, client: TestClient):
        pid = _create_project(client)
        resp = client.post(
            f"/api/projects/{pid}/plan-edit/parse",
            json={"command": "change PRJ-F23 from JY-QA to JY-QB"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["project_id"] == "PRJ-F23"
        assert body["field"] == "resource"
        assert body["from_value"] == "JY-QA"
        assert body["to_value"] == "JY-QB"

    def test_case_insensitive_command(self, client: TestClient):
        pid = _create_project(client)
        resp = client.post(
            f"/api/projects/{pid}/plan-edit/parse",
            json={"command": "CHANGE PRJ-A01 FROM Dock-1 TO Dock-2"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["project_id"] == "PRJ-A01"

    def test_unsupported_pattern_returns_422(self, client: TestClient):
        pid = _create_project(client)
        resp = client.post(
            f"/api/projects/{pid}/plan-edit/parse",
            json={"command": "move everything earlier"},
        )
        assert resp.status_code == 422

    def test_unknown_project_returns_404(self, client: TestClient):
        resp = client.post(
            "/api/projects/99999/plan-edit/parse",
            json={"command": "change PRJ-001 from A to B"},
        )
        assert resp.status_code == 404


# ===========================================================================
# Tests: PUT /{project_id}/plan
# ===========================================================================

SAMPLE_ROWS = [
    {
        "project_id": "PRJ-001",
        "project_name": "Hull Assembly",
        "duration_days": 10,
        "start_date": "2026-03-01",
        "end_date": "2026-03-11",
        "resource": "JY-QA",
        "dependencies": "",
        "cost": "50000",
        "priority": "High",
    }
]


class TestUpsertPlan:
    def test_creates_new_plan_row(self, client: TestClient):
        pid = _create_project(client)
        resp = client.put(f"/api/projects/{pid}/plan", json={"rows": SAMPLE_ROWS})
        assert resp.status_code == 200
        body = resp.json()
        assert body["project_id"] == pid
        assert body["rows"] == 1
        assert "id" in body

    def test_updates_existing_plan_row(self, client: TestClient):
        pid = _create_project(client)
        # First upsert
        r1 = client.put(f"/api/projects/{pid}/plan", json={"rows": SAMPLE_ROWS})
        assert r1.status_code == 200
        plan_id_first = r1.json()["id"]

        # Second upsert with 2 rows
        two_rows = SAMPLE_ROWS + [
            {**SAMPLE_ROWS[0], "project_id": "PRJ-002", "project_name": "Engine Install"}
        ]
        r2 = client.put(f"/api/projects/{pid}/plan", json={"rows": two_rows})
        assert r2.status_code == 200
        body2 = r2.json()
        # Same plan row id (updated in place)
        assert body2["id"] == plan_id_first
        assert body2["rows"] == 2

    def test_unknown_project_returns_404(self, client: TestClient):
        resp = client.put("/api/projects/99999/plan", json={"rows": SAMPLE_ROWS})
        assert resp.status_code == 404


# ===========================================================================
# Tests: POST /{project_id}/yard-availability  (monkeypatched sleep)
# ===========================================================================


class TestYardAvailability:
    def test_returns_six_yards(self, client: TestClient):
        pid = _create_project(client)
        with patch(
            "src.services.simulation_service.asyncio.sleep",
            new_callable=AsyncMock,
        ):
            resp = client.post(f"/api/projects/{pid}/yard-availability")
        assert resp.status_code == 200
        body = resp.json()
        assert "yards" in body
        assert len(body["yards"]) == 6

    def test_yard_shape(self, client: TestClient):
        pid = _create_project(client)
        with patch(
            "src.services.simulation_service.asyncio.sleep",
            new_callable=AsyncMock,
        ):
            resp = client.post(f"/api/projects/{pid}/yard-availability")
        yards = resp.json()["yards"]
        for yard in yards:
            assert "yard_name" in yard
            assert "location" in yard
            assert "availability" in yard

    def test_unknown_project_returns_404(self, client: TestClient):
        with patch(
            "src.services.simulation_service.asyncio.sleep",
            new_callable=AsyncMock,
        ):
            resp = client.post("/api/projects/99999/yard-availability")
        assert resp.status_code == 404


# ===========================================================================
# Tests: POST /{project_id}/capacity-plan  (monkeypatched sleep)
# ===========================================================================


class TestCapacityPlan:
    def test_returns_plan_rows_and_rationale(self, client: TestClient):
        pid = _create_project(client)
        payload = {
            "selected_yards": ["JY-QA", "JY-QB"],
            "prompt": "Minimise critical path duration",
        }
        with patch(
            "src.services.simulation_service.asyncio.sleep",
            new_callable=AsyncMock,
        ):
            resp = client.post(f"/api/projects/{pid}/capacity-plan", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert "plan" in body
        assert "rationale" in body
        assert len(body["plan"]) >= 17  # fixture CSV has 17-18 data rows
        assert len(body["rationale"]) > 0

    def test_rationale_mentions_selected_yards(self, client: TestClient):
        pid = _create_project(client)
        payload = {
            "selected_yards": ["JY-QA", "JY-QB"],
            "prompt": "Prioritise safety",
        }
        with patch(
            "src.services.simulation_service.asyncio.sleep",
            new_callable=AsyncMock,
        ):
            resp = client.post(f"/api/projects/{pid}/capacity-plan", json=payload)
        rationale = resp.json()["rationale"]
        assert "JY-QA" in rationale

    def test_unknown_project_returns_404(self, client: TestClient):
        payload = {"selected_yards": ["JY-QA"], "prompt": "test"}
        with patch(
            "src.services.simulation_service.asyncio.sleep",
            new_callable=AsyncMock,
        ):
            resp = client.post("/api/projects/99999/capacity-plan", json=payload)
        assert resp.status_code == 404
