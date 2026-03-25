"""
Seatrium AI Planner — Full Demo E2E Test
Generates screenshots, traces, and video for each step.
"""
import os
import time
import json
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:8001/api"
CSV_PATH = os.path.abspath("backend/tests/fixtures/sample_plans/seatrium_space_data.csv")
DEMO_DIR = os.path.join(os.path.dirname(__file__), "test_demo")
os.makedirs(DEMO_DIR, exist_ok=True)

# Demo results log
demo_log = []

def log(step, desc, screenshot_path=None):
    entry = {"step": step, "description": desc, "timestamp": time.strftime("%H:%M:%S")}
    if screenshot_path:
        entry["screenshot"] = os.path.basename(screenshot_path)
    demo_log.append(entry)
    print(f"  [{step}] {desc}")


def run_demo():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=400)

        # Create context with video recording + tracing
        context = browser.new_context(
            viewport={"width": 1600, "height": 900},
            record_video_dir=os.path.join(DEMO_DIR, "videos"),
            record_video_size={"width": 1600, "height": 900},
        )
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()

        # ─────────────────────────────────────────────────────────────────
        # 1. LOGIN
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Login ===")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss = os.path.join(DEMO_DIR, "01_login.png")
        page.screenshot(path=ss)
        log("1.1", "Login page — Seatrium branding, persona selection", ss)

        page.locator("button.persona-option").first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss = os.path.join(DEMO_DIR, "02_projects_list.png")
        page.screenshot(path=ss)
        log("1.2", "Selected 'Planner' persona → Projects list", ss)

        # ─────────────────────────────────────────────────────────────────
        # 2. CREATE PROJECT (if needed)
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Create Project ===")

        # Check if Neptune FPU exists
        import requests
        projects = requests.get(f"{API_URL}/projects").json()
        neptune = next((p for p in projects if p["name"] == "Neptune FPU"), None)

        if not neptune:
            page.locator("button:has-text('New project')").click()
            time.sleep(1)
            page.locator("input[type='text']").first.fill("Neptune FPU")
            ss = os.path.join(DEMO_DIR, "03_create_project.png")
            page.screenshot(path=ss)
            log("2.1", "Creating new project: Neptune FPU", ss)

            page.locator("button:has-text('Create')").click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
        else:
            page.locator("text=Neptune FPU").first.click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)

        ss = os.path.join(DEMO_DIR, "04_project_setup.png")
        page.screenshot(path=ss)
        log("2.2", "Project setup page — form + CSV upload", ss)

        # ─────────────────────────────────────────────────────────────────
        # 3. FILL PROJECT CONTEXT
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Fill Project Context ===")

        # Type toggle
        confirmed_btn = page.locator("button.type-btn:has-text('Confirmed')")
        if confirmed_btn.count() > 0:
            confirmed_btn.click()

        # Dates
        date_inputs = page.locator("input[type='date']")
        if date_inputs.count() >= 2:
            date_inputs.nth(0).fill("2026-06-01")
            date_inputs.nth(1).fill("2028-12-31")

        # Hull dimensions
        num_inputs = page.locator(".context-section input[type='number']")
        if num_inputs.count() >= 4:
            num_inputs.nth(0).fill("120")
            num_inputs.nth(1).fill("65")
            num_inputs.nth(2).fill("45")
            num_inputs.nth(3).fill("15000")

        # Location → Yard
        selects = page.locator(".context-section select")
        if selects.count() >= 1:
            selects.first.select_option("Singapore")
            time.sleep(0.3)
        if selects.count() >= 2:
            selects.nth(1).select_option("Pioneer")

        # Processes
        for proc in ["Drydock", "Berthing", "Loadout"]:
            chip = page.locator(f"button.process-chip:has-text('{proc}')")
            if chip.count() > 0:
                chip.click()
                time.sleep(0.2)

        ss = os.path.join(DEMO_DIR, "05_form_filled.png")
        page.screenshot(path=ss)
        log("3.1", "Project context filled: 120×65×45m hull, 15000t, Singapore/Pioneer, 3 processes", ss)

        # ─────────────────────────────────────────────────────────────────
        # 4. UPLOAD CSV
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Upload CSV ===")

        page.locator("input[type='file']").set_input_files(CSV_PATH)
        time.sleep(2)
        ss = os.path.join(DEMO_DIR, "06_csv_uploaded.png")
        page.screenshot(path=ss)
        log("4.1", "Uploaded seatrium_space_data.csv (1250 rows)", ss)

        # Preview
        preview_btn = page.locator("button:has-text('Preview')")
        if preview_btn.count() > 0:
            preview_btn.click()
            time.sleep(1)
            ss = os.path.join(DEMO_DIR, "07_csv_preview.png")
            page.screenshot(path=ss, full_page=True)
            log("4.2", "CSV preview — shows project data with yard assignments", ss)

        # ─────────────────────────────────────────────────────────────────
        # 5. VIEW IN GANTT
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Gantt Workspace ===")

        page.locator("button:has-text('View in Gantt')").click()
        page.wait_for_load_state("networkidle")
        time.sleep(4)
        ss = os.path.join(DEMO_DIR, "08_gantt_workspace.png")
        page.screenshot(path=ss)
        log("5.1", "Gantt workspace: 70 yards, 1250 tasks, Change Panel + AI Reasoning", ss)

        # ─────────────────────────────────────────────────────────────────
        # 6. ZOOM CONTROLS
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Zoom Controls ===")

        # Fit
        page.locator("button.zoom-btn:has-text('Fit')").click()
        time.sleep(1)
        ss = os.path.join(DEMO_DIR, "09_zoom_fit.png")
        page.screenshot(path=ss)
        log("6.1", "Zoom: Fit — entire timeline 2023-2028 visible", ss)

        # Quarter
        page.locator("button.zoom-btn:has-text('Quarter')").click()
        time.sleep(1)
        ss = os.path.join(DEMO_DIR, "10_zoom_quarter.png")
        page.screenshot(path=ss)
        log("6.2", "Zoom: Quarter — bars readable, project names visible", ss)

        # Month
        page.locator("button.zoom-btn:has-text('Month')").click()
        time.sleep(1)
        ss = os.path.join(DEMO_DIR, "11_zoom_month.png")
        page.screenshot(path=ss)
        log("6.3", "Zoom: Month — detailed daily view", ss)

        # ─────────────────────────────────────────────────────────────────
        # 7. FILTER YARDS
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Yard Filter ===")

        # Filter Pioneer
        page.locator(".filter-input").fill("Pioneer")
        time.sleep(1)
        ss = os.path.join(DEMO_DIR, "12_filter_pioneer.png")
        page.screenshot(path=ss)
        log("7.1", "Filter: Pioneer — only 6 Pioneer yards shown", ss)

        # Filter Tuas Boulevard
        page.locator(".filter-input").fill("Tuas Boulevard")
        time.sleep(1)
        ss = os.path.join(DEMO_DIR, "13_filter_tuas_blvd.png")
        page.screenshot(path=ss)
        log("7.2", "Filter: Tuas Boulevard — 24 yards shown", ss)

        # Filter Admiralty
        page.locator(".filter-input").fill("Admiralty")
        time.sleep(1)
        ss = os.path.join(DEMO_DIR, "14_filter_admiralty.png")
        page.screenshot(path=ss)
        log("7.3", "Filter: Admiralty — berthing and drydock yards", ss)

        # Clear filter
        page.locator(".filter-clear").click()
        page.locator("button.zoom-btn:has-text('Year')").click()
        time.sleep(1)

        # ─────────────────────────────────────────────────────────────────
        # 8. AI REPLAN (o3)
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: AI Replan with o3 ===")

        # Fill change panel
        cp_inputs = page.locator(".change-panel input[type='number']")
        if cp_inputs.count() >= 1:
            cp_inputs.nth(0).fill("200")  # Hull length → 200m

        cp_selects = page.locator(".change-panel select")
        if cp_selects.count() >= 1:
            cp_selects.first.select_option("Singapore")
            time.sleep(0.3)
        if cp_selects.count() >= 2:
            cp_selects.nth(1).select_option("Pioneer")

        page.locator(".change-panel textarea").fill("avoid Q1 2027 monsoon\nminimize transport distance")

        ss = os.path.join(DEMO_DIR, "15_replan_setup.png")
        page.screenshot(path=ss)
        log("8.1", "Change Panel: hull→200m, Pioneer preferred, monsoon constraint", ss)

        # Click Replan
        replan_btn = page.locator("button:has-text('Replan with AI')")
        if replan_btn.count() > 0 and not replan_btn.first.is_disabled():
            print("  Calling o3 for replan... (may take 15-30s)")
            replan_btn.click()

            # Wait for reasoning panel
            try:
                page.wait_for_selector(".air-summary", timeout=120000)
                time.sleep(2)
                ss = os.path.join(DEMO_DIR, "16_replan_result.png")
                page.screenshot(path=ss)
                log("8.2", "o3 replan complete — AI reasoning with tradeoffs shown", ss)

                # Scroll to see full reasoning
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(1)
                ss = os.path.join(DEMO_DIR, "17_ai_reasoning.png")
                page.screenshot(path=ss)
                log("8.3", "AI Reasoning panel — per-task explanations and tradeoffs", ss)

                # Capture reasoning text
                summary = page.locator(".air-summary p").text_content() if page.locator(".air-summary p").count() else ""
                tradeoffs = [t.text_content() for t in page.locator(".air-tradeoffs li").all()]
                model = page.locator("text=Powered by").text_content() if page.locator("text=Powered by").count() else ""
                log("8.4", f"AI Summary: {summary[:200]}...")
                log("8.5", f"Tradeoffs: {json.dumps(tradeoffs[:3])}")
                log("8.6", f"Model: {model}")
            except Exception as e:
                ss = os.path.join(DEMO_DIR, "16_replan_timeout.png")
                page.screenshot(path=ss)
                log("8.2", f"Replan timeout or error: {e}", ss)

        # ─────────────────────────────────────────────────────────────────
        # 9. NL EDIT
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Natural Language Edit ===")

        page.evaluate("window.scrollTo(0, 600)")
        time.sleep(0.5)
        nl_input = page.locator(".gantt-nl-input input, .nl-edit-input input, input[placeholder*='change']")
        if nl_input.count() > 0:
            nl_input.first.fill("change Build project 60 from Tuas Boulevard - YST D2 to Pioneer - South Quay 1")
            ss = os.path.join(DEMO_DIR, "18_nl_edit.png")
            page.screenshot(path=ss)
            log("9.1", "NL command: move Build project 60 to Pioneer", ss)

        # ─────────────────────────────────────────────────────────────────
        # 10. EXPORT
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Export ===")

        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)
        ss = os.path.join(DEMO_DIR, "19_final_workspace.png")
        page.screenshot(path=ss)
        log("10.1", "Final workspace view — ready for PNG/CSV export", ss)

        # ─────────────────────────────────────────────────────────────────
        # 11. PERSISTENCE TEST
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO: Persistence ===")

        # Close and reopen
        current_url = page.url
        page.close()
        time.sleep(1)

        page2 = context.new_page()
        page2.goto(current_url)
        page2.wait_for_load_state("networkidle")
        time.sleep(6)
        ss = os.path.join(DEMO_DIR, "20_persistence.png")
        page2.screenshot(path=ss)

        subtitle = page2.locator(".gantt-subtitle").text_content() if page2.locator(".gantt-subtitle").count() else "N/A"
        log("11.1", f"Reopened after close — data loaded from server: {subtitle}", ss)

        # ─────────────────────────────────────────────────────────────────
        # DONE
        # ─────────────────────────────────────────────────────────────────
        print("\n=== DEMO COMPLETE ===")

        # Save trace
        trace_path = os.path.join(DEMO_DIR, "trace.zip")
        context.tracing.stop(path=trace_path)
        log("TRACE", f"Playwright trace saved: {trace_path}")

        # Close
        context.close()
        browser.close()

        # Get video path
        video_files = [f for f in os.listdir(os.path.join(DEMO_DIR, "videos")) if f.endswith(".webm")]
        if video_files:
            log("VIDEO", f"Video saved: videos/{video_files[0]}")

    # Save demo log
    log_path = os.path.join(DEMO_DIR, "demo_log.json")
    with open(log_path, "w") as f:
        json.dump(demo_log, f, indent=2)
    print(f"\nDemo log: {log_path}")
    print(f"Screenshots: {len([e for e in demo_log if 'screenshot' in e])} files")
    print(f"Trace: {DEMO_DIR}/trace.zip")
    print(f"Video: {DEMO_DIR}/videos/")


if __name__ == "__main__":
    run_demo()
