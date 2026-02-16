import importlib
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _configure_test_environment(tmp_path: Path):
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

    db = importlib.import_module("src.db")
    importlib.reload(db)

    main = importlib.import_module("src.main")
    importlib.reload(main)

    with TestClient(main.app) as test_client:
        yield test_client


def _write_sample_csv(tmp_path: Path) -> Path:
    content = (
        "Task ID,Task Name,Duration (days),Start Date,End Date,Dependencies,Cost,Priority\n"
        "T001,Hull Assembly,10,2026-03-01,2026-03-11,,50000,High\n"
        "T002,Engine Install,7,2026-03-12,2026-03-19,T001,30000,Medium\n"
        "T003,Electrical Wiring,5,2026-03-12,2026-03-17,T001,15000,Low\n"
    )
    path = tmp_path / "sample_plan.csv"
    path.write_text(content)
    return path


def _upload_plan(client: TestClient, file_path: Path):
    with file_path.open("rb") as handle:
        response = client.post(
            "/api/plans/upload",
            files={"file": (file_path.name, handle, "text/csv")},
            data={"name": "Test Plan", "description": "Test upload"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["plan_id"]
    assert payload["tasks_count"] == 3
    return payload


def test_phase7_phase8_api_flow(client: TestClient, tmp_path: Path):
    file_path = _write_sample_csv(tmp_path)
    upload_payload = _upload_plan(client, file_path)
    plan_id = upload_payload["plan_id"]

    generate_response = client.post(f"/api/plans/{plan_id}/generate")
    assert generate_response.status_code == 200
    generate_payload = generate_response.json()
    assert generate_payload["plan_id"]
    assert generate_payload["original_plan_id"] == plan_id
    assert generate_payload["model_used"] == "mock-o1-mini"

    ai_plan_id = generate_payload["plan_id"]

    details_response = client.get(f"/api/plans/{ai_plan_id}/details")
    assert details_response.status_code == 200
    details_payload = details_response.json()
    assert details_payload["tasks"]
    assert details_payload["recommendations"]

    compare_response = client.post(
        "/api/plans/compare", json={"plan_id_1": plan_id, "plan_id_2": ai_plan_id}
    )
    assert compare_response.status_code == 200
    compare_payload = compare_response.json()
    assert compare_payload["summary"]

    constraints_response = client.post(
        f"/api/plans/{plan_id}/constraints",
        json={"constraints": {"max_tasks": 50}, "regenerate": True},
    )
    assert constraints_response.status_code == 200
    constraints_payload = constraints_response.json()
    assert constraints_payload["id"]

    recommendation = details_payload["recommendations"][0]
    assert recommendation.get("id") is not None

    decision_response = client.post(
        f"/api/plans/{ai_plan_id}/recommendations/{recommendation['id']}",
        json={"accept": True},
    )
    assert decision_response.status_code == 200
    decision_payload = decision_response.json()
    assert decision_payload["status"] == "accepted"

    for export_format, expected_type in [
        ("csv", "text/csv"),
        ("json", "application/json"),
        ("gantt", "application/json"),
    ]:
        export_response = client.get(f"/api/plans/{ai_plan_id}/export?format={export_format}")
        assert export_response.status_code == 200
        assert expected_type in export_response.headers["content-type"]
