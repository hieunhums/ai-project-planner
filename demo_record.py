"""
Seatrium AI Planner — Demo Recording (2 flows)
  PART A: Create a new project from scratch
  PART B: Open existing project → replan with AI

Run: source backend/.venv/bin/activate && python demo_record.py
"""
import os, time, json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
CSV_PATH = os.path.abspath("backend/tests/fixtures/sample_plans/seatrium_projects.csv")
OUT = os.path.join(os.path.dirname(__file__), "demo_recording")
os.makedirs(os.path.join(OUT, "screenshots"), exist_ok=True)
os.makedirs(os.path.join(OUT, "videos"), exist_ok=True)

step_num = 0
log_entries = []


def snap(page, name, desc, wait=1.5, full=False):
    global step_num
    step_num += 1
    time.sleep(wait)
    fname = f"{step_num:02d}_{name}.png"
    page.screenshot(path=os.path.join(OUT, "screenshots", fname), full_page=full)
    log_entries.append({"step": step_num, "name": name, "desc": desc, "file": fname})
    print(f"  [{step_num:02d}] {name}: {desc}")


def smooth_scroll(page, target="bottom", wait=1.5):
    if target == "bottom":
        page.evaluate("window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})")
    else:
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    time.sleep(wait)


def human_type(locator, text, delay=0.05):
    locator.click()
    locator.press_sequentially(text, delay=int(delay * 1000))


def human_clear_type(locator, text, delay=0.05):
    locator.click()
    locator.press("Control+a")
    time.sleep(0.1)
    locator.press_sequentially(text, delay=int(delay * 1000))


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=250)
        ctx = browser.new_context(
            viewport={"width": 1600, "height": 900},
            record_video_dir=os.path.join(OUT, "videos"),
            record_video_size={"width": 1600, "height": 900},
        )
        ctx.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = ctx.new_page()

        # ═══════════════════════════════════════════════════════════
        # LOGIN
        # ═══════════════════════════════════════════════════════════
        print("\n🎬 LOGIN")
        page.goto(f"{BASE}/login")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        snap(page, "login", "Seatrium AI Planner — login")

        page.locator("button.persona-option").first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(3)
        snap(page, "home", "Home — projects + yard overview")

        # ═══════════════════════════════════════════════════════════
        # PART A: CREATE NEW PROJECT
        # ═══════════════════════════════════════════════════════════
        print("\n🎬 PART A: Create New Project")

        page.locator("button:has-text('New project')").click()
        time.sleep(1)
        snap(page, "create_dialog", "Create project dialog")

        # Type project name
        name_input = page.locator("input[type='text']").first
        human_type(name_input, "Emerald Jack-Up Rig", delay=0.06)
        time.sleep(0.5)
        snap(page, "create_typed", "Project name typed")

        page.locator("button:has-text('Create')").click()
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        snap(page, "setup_page", "Project setup — form + CSV upload")

        # Fill form fields
        print("  Filling project context...")

        # Type toggle
        confirmed = page.locator("button.type-btn:has-text('Confirmed')")
        if confirmed.count():
            confirmed.click()
            time.sleep(0.3)

        # Dates
        date_inputs = page.locator("input[type='date']")
        if date_inputs.count() >= 2:
            date_inputs.nth(0).fill("2025-04-01")
            time.sleep(0.3)
            date_inputs.nth(1).fill("2026-11-06")
            time.sleep(0.3)

        # Hull dimensions
        num_inputs = page.locator(".context-section input[type='number']")
        if num_inputs.count() >= 4:
            human_clear_type(num_inputs.nth(0), "200", delay=0.08)
            time.sleep(0.2)
            human_clear_type(num_inputs.nth(1), "65", delay=0.08)
            time.sleep(0.2)
            human_clear_type(num_inputs.nth(2), "45", delay=0.08)
            time.sleep(0.2)
            human_clear_type(num_inputs.nth(3), "19000", delay=0.06)
            time.sleep(0.3)

        # Location & Yard
        selects = page.locator(".context-section select")
        if selects.count() >= 1:
            selects.first.select_option("Singapore")
            time.sleep(0.5)
        if selects.count() >= 2:
            selects.nth(1).select_option("Pioneer")
            time.sleep(0.3)

        # Processes
        for proc in ["Drydock", "Berthing", "Loadout"]:
            chip = page.locator(f"button.process-chip:has-text('{proc}')")
            if chip.count():
                chip.click()
                time.sleep(0.3)

        snap(page, "form_filled", "Project context filled — 200m hull, Pioneer, Drydock+Berthing+Loadout")

        # Upload CSV
        print("  Uploading CSV...")
        file_input = page.locator("input[type='file']")
        if file_input.count():
            file_input.set_input_files(CSV_PATH)
            time.sleep(2)
            snap(page, "csv_uploaded", "CSV uploaded — seatrium_projects.csv")

        # Submit
        submit = page.locator("button:has-text('View in Gantt'), button:has-text('Generate Plan')")
        if submit.count() and not submit.first.is_disabled():
            submit.first.click()
            page.wait_for_load_state("networkidle")
            time.sleep(5)
            snap(page, "new_project_workspace", "New project workspace — project plan")
            snap(page, "new_project_full", "Full page", full=True, wait=1)

        # Go back home
        home_link = page.locator("a.header-logo")
        if home_link.count():
            home_link.click()
        else:
            page.goto(f"{BASE}/projects")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        snap(page, "home_after_create", "Home — now shows 2 projects")

        # ═══════════════════════════════════════════════════════════
        # PART B: OPEN EXISTING → REPLAN
        # ═══════════════════════════════════════════════════════════
        print("\n🎬 PART B: Open Neptune FPSO & Replan")

        page.locator("text=Neptune FPSO").first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(5)
        snap(page, "neptune_project", "Neptune FPSO — project details + plan")

        # Quick look at yard overview
        yard_tab = page.locator("button.ws-view-tab:has-text('Yard Overview')")
        if yard_tab.count():
            yard_tab.click()
            time.sleep(2)
            snap(page, "neptune_yards", "Yard Overview — capacity across all yards")

            # Drill into Tuas Boulevard
            tuas = page.locator("td.hm-yard-cell:has-text('Tuas Boulevard')")
            if tuas.count():
                tuas.click()
                time.sleep(3)
                snap(page, "tuas_drilldown", "Tuas Boulevard — color-coded vessels")

                back = page.locator("button.gantt-breadcrumb-back")
                if back.count():
                    back.click()
                    time.sleep(1)

        # Back to project plan
        proj_tab = page.locator("button.ws-view-tab:has-text('Project Plan')")
        if proj_tab.count():
            proj_tab.click()
            time.sleep(1)

        # Enter replan mode
        print("  Entering replan mode...")
        replan_btn = page.locator("button.ws-mode-btn--enter")
        if replan_btn.count():
            replan_btn.click()
            time.sleep(2)
            snap(page, "replan_mode", "Replan mode — pre-filled config")

        # Type changes
        cp_inputs = page.locator(".change-panel input[type='number']")
        if cp_inputs.count() >= 1:
            human_clear_type(cp_inputs.nth(0), "250", delay=0.1)
            time.sleep(0.3)

        cp_selects = page.locator(".change-panel select")
        if cp_selects.count() >= 2:
            cp_selects.nth(1).select_option("Pioneer")
            time.sleep(0.5)

        cp_textarea = page.locator(".change-panel textarea").first
        if cp_textarea.count():
            cp_textarea.click()
            time.sleep(0.2)
            cp_textarea.press_sequentially(
                "avoid Q1 2027 monsoon season\nmust complete by Dec 2026\nPioneer Admiral Dock preferred",
                delay=25
            )
            time.sleep(0.5)

        snap(page, "replan_changes", "Changes: hull 250m, Pioneer, tight deadline")
        smooth_scroll(page, "bottom", 1.5)
        snap(page, "replan_changes_scroll", "Changes Detected visible")
        smooth_scroll(page, "top", 1)

        # Trigger replan
        replan_ai = page.locator(".cp-replan-btn")
        if replan_ai.count() and not replan_ai.first.is_disabled():
            print("  ⏳ Calling gpt-5.4-mini...")
            replan_ai.click()

            try:
                page.wait_for_selector(".ws-streaming-card, .air-panel", timeout=15000)
                time.sleep(1)
                if page.locator(".ws-streaming-card").count():
                    snap(page, "streaming", "AI analyzing — streaming")

                page.wait_for_selector(".air-panel", timeout=120000)
                time.sleep(3)
                snap(page, "proposal", "AI Proposal — summary + reasoning")

                smooth_scroll(page, "bottom", 2)
                snap(page, "proposal_scroll", "Tradeoffs + approval with delta table")

                smooth_scroll(page, "top", 1)
                snap(page, "proposal_full", "Full replan view", full=True)

                # Log
                summary = page.locator(".air-summary")
                if summary.count():
                    print(f"\n  📝 {summary.first.text_content()[:300]}...")
                model = page.locator(".air-model")
                if model.count():
                    print(f"  🤖 {model.first.text_content()}")

            except Exception as e:
                print(f"  ❌ {e}")
                snap(page, "error", f"Error: {e}")

        # Approve
        print("\n🎬 Approve Changes")
        smooth_scroll(page, "bottom", 1)
        approve = page.locator(".ws-approve-btn")
        if approve.count():
            time.sleep(1)
            approve.click()
            time.sleep(2)
            snap(page, "approved", "Changes applied")

        # Exit replan
        exit_btn = page.locator("button:has-text('Exit Replan')")
        if exit_btn.count():
            exit_btn.click()
            time.sleep(1.5)
            snap(page, "after_replan", "Project view after replan")

        # Home
        home_link = page.locator("a.header-logo")
        if home_link.count():
            home_link.click()
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        snap(page, "final_home", "Final — home page")

        # ═══════════════════════════════════════════════════════════
        # SAVE
        # ═══════════════════════════════════════════════════════════
        print("\n💾 Saving...")
        ctx.tracing.stop(path=os.path.join(OUT, "trace.zip"))
        page.close()
        ctx.close()
        browser.close()

        vids = [f for f in os.listdir(os.path.join(OUT, "videos")) if f.endswith(".webm")]
        vid_path = f"videos/{vids[0]}" if vids else "N/A"

        with open(os.path.join(OUT, "demo_script.json"), "w") as f:
            json.dump({
                "title": "Seatrium AI Planner — Full Demo",
                "date": time.strftime("%Y-%m-%d"),
                "parts": ["A: Create New Project", "B: Replan Existing"],
                "steps": log_entries,
                "video": vid_path,
                "trace": "trace.zip",
                "total_screenshots": len(log_entries),
            }, f, indent=2)

        print(f"\n{'='*60}")
        print(f"DEMO COMPLETE — {len(log_entries)} steps")
        print(f"{'='*60}")
        print(f"Screenshots: {OUT}/screenshots/")
        print(f"Video:       {OUT}/{vid_path}")
        print(f"Trace:       {OUT}/trace.zip")
        print(f"View:        npx playwright show-trace {OUT}/trace.zip")


if __name__ == "__main__":
    run()
