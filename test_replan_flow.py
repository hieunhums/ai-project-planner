"""
Quick smoke test — view mode → replan mode → fill params → verify.
Run: source backend/.venv/bin/activate && python test_replan_flow.py
"""
import os, time, json
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
OUT = os.path.join(os.path.dirname(__file__), "test_replan_screenshots")
os.makedirs(OUT, exist_ok=True)

step_num = 0

def snap(page, name, desc, wait=1, full=False):
    global step_num
    step_num += 1
    time.sleep(wait)
    fname = f"{step_num:02d}_{name}.png"
    page.screenshot(path=os.path.join(OUT, fname), full_page=full)
    print(f"  [{step_num:02d}] {name}: {desc}")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        ctx = browser.new_context(viewport={"width": 1600, "height": 900})
        page = ctx.new_page()

        # Clear session
        page.goto(f"{BASE_URL}/projects/1/gantt")
        page.evaluate("sessionStorage.clear()")
        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(4)

        # ── 1: View mode — should show project summary + project plan tab ──
        print("\n=== 1: View Mode ===")
        snap(page, "view_mode", "Default view — project summary + project Gantt")

        # Check what's visible
        has_summary = page.locator(".project-summary-card").count()
        has_tabs = page.locator(".ws-view-tabs").count()
        has_heatmap = page.locator("text=Yard Capacity Heatmap").count()
        has_project_gantt = page.locator("text=AI Generated Project Plan").count()
        print(f"  Summary card: {has_summary}, Tabs: {has_tabs}, Heatmap: {has_heatmap}, Project Gantt: {has_project_gantt}")

        # ── 2: Click Yard Overview tab ──
        print("\n=== 2: Yard Overview Tab ===")
        yard_tab = page.locator("button:has-text('Yard Overview')")
        if yard_tab.count():
            yard_tab.click()
            time.sleep(2)
            snap(page, "yard_overview", "Yard Overview tab — heatmap")
            has_heatmap_now = page.locator("text=Yard Capacity Heatmap").count()
            print(f"  Heatmap visible: {has_heatmap_now}")

        # ── 3: Click back to Project Plan tab ──
        print("\n=== 3: Project Plan Tab ===")
        proj_tab = page.locator("button:has-text('Project Plan')")
        if proj_tab.count():
            proj_tab.click()
            time.sleep(1)
            snap(page, "project_plan", "Project Plan tab — vessel Gantt")

        # ── 4: Enter Replan mode ──
        print("\n=== 4: Enter Replan Mode ===")
        replan_btn = page.locator("button.ws-mode-btn--enter")
        if replan_btn.count():
            replan_btn.click()
            time.sleep(1)
            snap(page, "replan_mode", "Replan mode entered")

            # Check what's visible now
            has_sidebar = page.locator(".change-panel").count()
            has_heatmap_replan = page.locator("text=Yard Capacity Heatmap").count()
            has_summary_replan = page.locator(".project-summary-card").count()
            has_tabs_replan = page.locator(".ws-view-tabs").count()
            print(f"  Sidebar: {has_sidebar}, Heatmap: {has_heatmap_replan}, Summary: {has_summary_replan}, Tabs: {has_tabs_replan}")

            # Check if change panel inputs work
            cp_inputs = page.locator(".change-panel input[type='number']")
            print(f"  Change panel inputs: {cp_inputs.count()}")

            if cp_inputs.count() >= 1:
                cp_inputs.nth(0).fill("200")

            cp_selects = page.locator(".change-panel select")
            if cp_selects.count() >= 1:
                cp_selects.first.select_option("Singapore")

            cp_textarea = page.locator(".change-panel textarea").first
            if cp_textarea.count():
                cp_textarea.fill("avoid Q1 2027 monsoon")

            time.sleep(0.5)
            snap(page, "replan_filled", "Replan params filled")

            # Check replan button state
            replan_ai = page.locator(".cp-replan-btn")
            if replan_ai.count():
                disabled = replan_ai.first.is_disabled()
                print(f"  Replan button disabled: {disabled}")

        # ── 5: Exit replan ──
        print("\n=== 5: Exit Replan ===")
        exit_btn = page.locator("button:has-text('Exit Replan')")
        if exit_btn.count():
            exit_btn.click()
            time.sleep(1)
            snap(page, "back_to_view", "Back to view mode")
            has_summary_back = page.locator(".project-summary-card").count()
            has_tabs_back = page.locator(".ws-view-tabs").count()
            print(f"  Summary: {has_summary_back}, Tabs: {has_tabs_back}")

        print(f"\n{'='*60}")
        print(f"COMPLETE — {step_num} screenshots")
        print(f"{'='*60}")

        time.sleep(2)
        ctx.close()
        browser.close()


if __name__ == "__main__":
    run()
