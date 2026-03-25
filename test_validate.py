"""
Quick validation test — run against local or Azure.
Usage:
  python test_validate.py                    # local (localhost)
  python test_validate.py --azure            # Azure deployment
"""
import sys, time, requests

LOCAL = "http://localhost:8001/api"
AZURE = "https://ca-backend-bsyp5s23kyxoa.wittygrass-e4069b97.southeastasia.azurecontainerapps.io/api"

API = AZURE if "--azure" in sys.argv else LOCAL
results = []

def check(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    results.append((name, status))
    mark = "✅" if ok else "❌"
    print(f"  {mark} {name}" + (f" — {detail}" if detail else ""))

print(f"\n🔍 Testing: {API}\n")

# ── 1. API Health ──
print("── API Health ──")
try:
    r = requests.get(f"{API}/projects", timeout=30)
    check("GET /projects", r.status_code == 200, f"{r.status_code}")
    projects = r.json()
    check("Returns list", isinstance(projects, list), f"{len(projects)} projects")
except Exception as e:
    check("API reachable", False, str(e))
    print("\n⛔ API unreachable, stopping.\n")
    sys.exit(1)

# ── 2. Project CRUD ──
print("\n── Project CRUD ──")
r = requests.post(f"{API}/projects", json={"name": "Validation Test"})
check("Create project", r.status_code == 201)
pid = r.json()["id"]

r = requests.get(f"{API}/projects/{pid}")
check("Get project detail", r.status_code == 200)
d = r.json()
check("Has hull_length field", "hull_length" in d)
check("Has preferred_yard field", "preferred_yard" in d)

r = requests.patch(f"{API}/projects/{pid}", json={"hull_length": 200, "preferred_yard": "Pioneer"})
check("PATCH project fields", r.status_code == 200)

r = requests.get(f"{API}/projects/{pid}")
d = r.json()
check("hull_length persisted", d.get("hull_length") == 200, f"{d.get('hull_length')}")
check("preferred_yard persisted", d.get("preferred_yard") == "Pioneer", f"{d.get('preferred_yard')}")

# Reset to null
r = requests.patch(f"{API}/projects/{pid}", json={"hull_length": None, "preferred_yard": None})
r = requests.get(f"{API}/projects/{pid}")
d = r.json()
check("PATCH null works", d.get("hull_length") is None)

# ── 3. Plan State ──
print("\n── Plan State ──")
import csv
rows = []
with open("backend/tests/fixtures/sample_plans/seatrium_projects.csv") as f:
    for row in csv.DictReader(f):
        rows.append(row)

r = requests.put(f"{API}/projects/{pid}/plan-state", json={"plan": rows, "human_plan": None, "rationale": "Test"})
check("Save plan state", r.status_code == 200)

r = requests.get(f"{API}/projects/{pid}/plan-state")
check("Load plan state", r.status_code == 200)
plan = r.json().get("plan", [])
check("Plan has 40 rows", len(plan) == 40, f"{len(plan)}")
check("Rows have project_id", all(r.get("project_id") for r in plan[:5]))
check("Rows have resource", all(r.get("resource") for r in plan[:5]))
check("Rows have dates", all(r.get("start_date") and r.get("end_date") for r in plan[:5]))

# ── 4. Replan Stream ──
print("\n── Replan Stream ──")
r = requests.post(f"{API}/projects/{pid}/replan/stream", json={"plan_rows": [], "changes": {}})
check("Stream endpoint exists", r.status_code == 400, "empty body returns 400")

# Quick non-stream replan test
neptune_rows = [r for r in plan if r["project_id"] == "Neptune FPSO"]
check("Neptune FPSO has rows", len(neptune_rows) == 5, f"{len(neptune_rows)}")

r = requests.post(f"{API}/projects/{pid}/replan", json={
    "plan_rows": plan,
    "changes": {
        "project_name": "Neptune FPSO",
        "preferred_yard": "Pioneer",
        "preferred_location": "Singapore",
        "optimization_goal": "minimize_duration",
    }
}, timeout=60)
check("Replan endpoint works", r.status_code == 200)
if r.status_code == 200:
    result = r.json()
    check("Has changed_rows", "changed_rows" in result)
    check("Has reasoning", "reasoning" in result)
    check("Has model", "model" in result, result.get("model"))
    changed = result.get("changed_rows", [])
    check("Changed rows > 0", len(changed) > 0, f"{len(changed)} rows")

    # Verify changes are for Neptune FPSO
    neptune_changes = [r for r in changed if r.get("project_id") == "Neptune FPSO"]
    check("Changes target Neptune FPSO", len(neptune_changes) > 0, f"{len(neptune_changes)} Neptune rows")

    # Verify Pioneer yard assigned
    pioneer_rows = [r for r in neptune_changes if "Pioneer" in (r.get("resource") or "")]
    check("Pioneer yard assigned", len(pioneer_rows) > 0, f"{len(pioneer_rows)} Pioneer rows")

    reasoning = result.get("reasoning", {})
    check("Summary not empty", bool(reasoning.get("summary")))
    check("Has tradeoffs", "tradeoffs" in reasoning)

# ── 5. Data Consistency ──
print("\n── Data Consistency ──")

# Apply changes and verify they persist
if r.status_code == 200 and changed:
    # Merge changes into plan
    make_key = lambda r: f"{r['project_id']}::{r['project_name']}"
    changed_map = {make_key(c): c for c in changed}
    new_plan = []
    for row in plan:
        k = make_key(row)
        if k in changed_map:
            new_plan.append({**row, **changed_map[k]})
        else:
            new_plan.append(row)

    r2 = requests.put(f"{API}/projects/{pid}/plan-state", json={"plan": new_plan, "human_plan": None, "rationale": "After replan"})
    check("Save updated plan", r2.status_code == 200)

    r3 = requests.get(f"{API}/projects/{pid}/plan-state")
    reloaded = r3.json().get("plan", [])
    check("Reloaded plan has same count", len(reloaded) == len(new_plan), f"{len(reloaded)} vs {len(new_plan)}")

    # Check Pioneer is in reloaded data
    reloaded_neptune = [r for r in reloaded if r.get("project_id") == "Neptune FPSO"]
    reloaded_pioneer = [r for r in reloaded_neptune if "Pioneer" in (r.get("resource") or "")]
    check("Pioneer persisted after reload", len(reloaded_pioneer) > 0, f"{len(reloaded_pioneer)} Pioneer rows")

# ── 6. Cleanup ──
print("\n── Cleanup ──")
r = requests.delete(f"{API}/projects/{pid}")
check("Delete test project", r.status_code == 204)

r = requests.get(f"{API}/projects")
remaining = [p for p in r.json() if p["name"] == "Validation Test"]
check("Project deleted", len(remaining) == 0)

# ── Summary ──
passed = sum(1 for _, s in results if s == "PASS")
failed = sum(1 for _, s in results if s == "FAIL")
print(f"\n{'='*50}")
print(f"{'✅' if failed == 0 else '❌'} {passed} PASS, {failed} FAIL")
print(f"{'='*50}\n")

if failed > 0:
    print("Failures:")
    for name, status in results:
        if status == "FAIL":
            print(f"  ❌ {name}")
    print()

sys.exit(0 if failed == 0 else 1)
