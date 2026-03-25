"""
Seatrium AI Planner — Demo Recording for Seatrium Presentation
Generates: screenshots, video, trace, and a demo script log.
Run: python demo_seatrium.py
"""
import os, time, json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = os.path.join(os.path.dirname(__file__), "demo_output")
os.makedirs(os.path.join(OUT, "screenshots"), exist_ok=True)
os.makedirs(os.path.join(OUT, "videos"), exist_ok=True)

log_entries = []
step_num = 0

def step(page, title, narration, wait=1.5):
    global step_num
    step_num += 1
    name = f"{step_num:02d}_{title.lower().replace(' ', '_').replace('→','to')}"
    time.sleep(wait)
    path = os.path.join(OUT, "screenshots", f"{name}.png")
    page.screenshot(path=path, full_page=False)
    log_entries.append({"step": step_num, "title": title, "narration": narration, "screenshot": f"screenshots/{name}.png"})
    print(f"  [{step_num:02d}] {title}")
    print(f"       {narration}")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=os.path.join(OUT, "videos"),
            record_video_size={"width": 1440, "height": 900},
        )
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()

        # ═══════════════════════════════════════════════════════════════
        # ACT 1: LOGIN & NAVIGATION
        # ═══════════════════════════════════════════════════════════════
        print("\n🎬 ACT 1: Login & Navigation")

        page.goto(f"{BASE}/login")
        page.wait_for_load_state("networkidle")
        step(page, "Login Page",
             "Seatrium AI Planner — shipyard scheduling tool. Planners select their role to enter.", wait=2)

        page.locator("button.persona-option").first.click()
        page.wait_for_load_state("networkidle")
        step(page, "Projects List",
             "Project dashboard shows Neptune FPU with 'View Plan' — data persists from previous session.", wait=2)

        # ═══════════════════════════════════════════════════════════════
        # ACT 2: OPEN PROJECT → HEATMAP
        # ═══════════════════════════════════════════════════════════════
        print("\n🎬 ACT 2: Yard Capacity Heatmap")

        page.locator(".project-card").first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(6)  # Wait for server data load
        step(page, "Capacity Heatmap",
             "One click → heatmap shows all yard groups with quarterly utilization. "
             "Red = overloaded, amber = busy, green = available. "
             "Pioneer at 51% avg, some quarters at 100%. Tuas Blvd at 45%.", wait=2)

        # Hover over a red cell for tooltip
        red_cell = None
        all_cells = page.locator(".hm-cell")
        for i in range(min(all_cells.count(), 200)):
            t = all_cells.nth(i).text_content() or ""
            if t.strip().isdigit() and int(t.strip()) >= 90:
                red_cell = all_cells.nth(i)
                break
        if red_cell:
            red_cell.hover()
            time.sleep(1)
            step(page, "Heatmap Tooltip",
                 "Hover any cell to see exact utilization and task count. "
                 "This cell shows 100% — yard is fully booked this quarter.", wait=1)

        # ═══════════════════════════════════════════════════════════════
        # ACT 3: DRILL INTO PIONEER
        # ═══════════════════════════════════════════════════════════════
        print("\n🎬 ACT 3: Pioneer Drill-Down")

        # Click Pioneer yard name for full yard view
        pioneer_yard = page.locator(".hm-yard-cell:has-text('Pioneer')")
        if pioneer_yard.count():
            pioneer_yard.click()
            time.sleep(3)
            step(page, "Pioneer Full View",
                 "Click yard name → Gantt shows ALL Pioneer locations across full timeline. "
                 "19 yards, 179 tasks. Breadcrumb: ← All Yards | Pioneer.", wait=2)

        # Go back
        page.locator(".gantt-breadcrumb-back").click()
        time.sleep(2)

        # Now click a specific Pioneer quarter cell
        pioneer_cells = page.locator(".hm-row:has-text('Pioneer') .hm-cell")
        for i in range(min(pioneer_cells.count(), 25)):
            t = pioneer_cells.nth(i).text_content() or ""
            if t.strip().isdigit() and 20 <= int(t.strip()) <= 80:
                pioneer_cells.nth(i).click()
                time.sleep(3)
                step(page, "Pioneer Quarter Drill-Down",
                     "Click a specific quarter cell → scoped Gantt showing only tasks in that time window. "
                     "Clean, focused view — no information overload.", wait=2)
                break

        # Go back for next act
        if page.locator(".gantt-breadcrumb-back").count():
            page.locator(".gantt-breadcrumb-back").click()
            time.sleep(2)

        # ═══════════════════════════════════════════════════════════════
        # ACT 4: DRILL INTO TUAS BOULEVARD
        # ═══════════════════════════════════════════════════════════════
        print("\n🎬 ACT 4: Tuas Boulevard Drill-Down")

        tuas_yard = page.locator(".hm-yard-cell:has-text('Tuas Boulevard')")
        if tuas_yard.count():
            tuas_yard.click()
            time.sleep(3)
            step(page, "Tuas Boulevard Gantt",
                 "Tuas Boulevard — 24 locations, largest yard complex. "
                 "Full resource names visible: YST D2, YST 19, YST 11...", wait=2)

            # Zoom to Quarter
            page.locator("button.zoom-btn:has-text('Quarter')").click()
            time.sleep(1)
            step(page, "Zoom Quarter",
                 "Zoom: Quarter view — bars spread out, project names fully readable. "
                 "Can see 'Build project 25 Drill Ship', 'Build project 60 Hull'.", wait=2)

            # Zoom to Month
            page.locator("button.zoom-btn:has-text('Month')").click()
            time.sleep(1)
            step(page, "Zoom Month",
                 "Zoom: Month view — daily granularity for precise scheduling analysis.", wait=2)

            # Back to Year
            page.locator("button.zoom-btn:has-text('Year')").click()
            time.sleep(1)

        # Go back
        if page.locator(".gantt-breadcrumb-back").count():
            page.locator(".gantt-breadcrumb-back").click()
            time.sleep(2)

        # ═══════════════════════════════════════════════════════════════
        # ACT 5: ADMIRALTY DRILL-DOWN
        # ═══════════════════════════════════════════════════════════════
        print("\n🎬 ACT 5: Admiralty Drill-Down")

        adm_yard = page.locator(".hm-yard-cell:has-text('Admiralty')")
        if adm_yard.count():
            adm_yard.click()
            time.sleep(3)
            step(page, "Admiralty Gantt",
                 "Admiralty — berthing and repair yards. Full names: "
                 "'Admiralty - B9 (Berthing)', 'Admiralty - Finger Pier'. "
                 "Repair projects stacked clearly per yard.", wait=2)

        # Go back
        if page.locator(".gantt-breadcrumb-back").count():
            page.locator(".gantt-breadcrumb-back").click()
            time.sleep(2)

        # ═══════════════════════════════════════════════════════════════
        # ACT 6: AI REPLAN WITH O3
        # ═══════════════════════════════════════════════════════════════
        print("\n🎬 ACT 6: AI Replan with o3")

        step(page, "Change Panel",
             "Left sidebar: 'What Changed?' panel. Planner specifies what's different — "
             "hull dimensions, yard preference, constraints. AI replans with reasoning.", wait=1)

        # Fill changes
        cp_inputs = page.locator(".change-panel input[type='number']")
        if cp_inputs.count() >= 1:
            cp_inputs.nth(0).click()
            cp_inputs.nth(0).fill("200")
            time.sleep(0.3)

        cp_selects = page.locator(".change-panel select")
        if cp_selects.count() >= 1:
            cp_selects.first.select_option("Singapore")
            time.sleep(0.3)
        if cp_selects.count() >= 2:
            cp_selects.nth(1).select_option("Pioneer")
            time.sleep(0.3)

        textarea = page.locator(".change-panel textarea")
        if textarea.count():
            textarea.fill("avoid Q1 2027 monsoon season\nminimize transport distance between yards")

        step(page, "Changes Specified",
             "Hull length changed to 200m, preferred yard: Pioneer, "
             "constraints: avoid monsoon + minimize transport. Ready to replan.", wait=1)

        # Click Replan
        replan_btn = page.locator("button:has-text('Replan with AI')")
        if replan_btn.count() and not replan_btn.first.is_disabled():
            print("  ⏳ Calling Azure OpenAI o3 for replan...")
            replan_btn.click()

            try:
                page.wait_for_selector(".air-summary", timeout=120000)
                time.sleep(2)
                step(page, "AI Reasoning",
                     "o3 reasoning model analyzed the schedule and returned optimized changes "
                     "with per-task explanations and tradeoffs. "
                     "AI explains WHY each change was made.", wait=2)

                # Scroll to see reasoning
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(1)

                # Capture reasoning text
                summary = page.locator(".air-summary p").text_content() if page.locator(".air-summary p").count() else ""
                model = page.locator("text=Powered by").text_content() if page.locator("text=Powered by").count() else ""

                step(page, "AI Tradeoffs",
                     f"Model: {model.strip()}. "
                     f"Reasoning: {summary[:200]}...", wait=2)
            except Exception:
                step(page, "AI Replan Timeout",
                     "o3 replan took longer than expected — may need retry.", wait=1)

        # ═══════════════════════════════════════════════════════════════
        # ACT 7: EXPORT
        # ═══════════════════════════════════════════════════════════════
        print("\n🎬 ACT 7: Export Options")

        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(1)
        step(page, "Export Ready",
             "Top bar: Export as PNG (chart image) or CSV (plan data). "
             "Undo button for reverting edits. Original vs AI Replan badges show comparison mode.", wait=2)

        # ═══════════════════════════════════════════════════════════════
        # FINALE
        # ═══════════════════════════════════════════════════════════════
        print("\n🎬 FINALE")

        # Go back to heatmap for closing shot
        if page.locator(".gantt-breadcrumb-back").count():
            page.locator(".gantt-breadcrumb-back").click()
            time.sleep(2)

        step(page, "Final Heatmap",
             "Back to the capacity overview. The Seatrium AI Planner: "
             "upload schedule → see capacity heatmap → drill into any yard → "
             "change parameters → AI replans with o3 reasoning → export.", wait=3)

        # ═══════════════════════════════════════════════════════════════
        # SAVE
        # ═══════════════════════════════════════════════════════════════
        print("\n💾 Saving artifacts...")

        # Trace
        trace_path = os.path.join(OUT, "trace.zip")
        context.tracing.stop(path=trace_path)
        print(f"  Trace: {trace_path}")

        # Close (triggers video save)
        page.close()
        context.close()
        browser.close()

        # Find video
        vids = [f for f in os.listdir(os.path.join(OUT, "videos")) if f.endswith(".webm")]
        vid_path = f"videos/{vids[0]}" if vids else "N/A"
        print(f"  Video: {OUT}/{vid_path}")

        # Save demo script
        script = {
            "title": "Seatrium AI Planner — Demo",
            "date": time.strftime("%Y-%m-%d"),
            "steps": log_entries,
            "video": vid_path,
            "trace": "trace.zip",
            "total_screenshots": len(log_entries),
        }
        script_path = os.path.join(OUT, "demo_script.json")
        with open(script_path, "w") as f:
            json.dump(script, f, indent=2)
        print(f"  Script: {script_path}")

        # Print summary
        print(f"\n{'='*60}")
        print(f"DEMO COMPLETE — {len(log_entries)} steps recorded")
        print(f"{'='*60}")
        print(f"Screenshots: {OUT}/screenshots/ ({len(log_entries)} files)")
        print(f"Video:       {OUT}/{vid_path}")
        print(f"Trace:       {OUT}/trace.zip")
        print(f"Script:      {OUT}/demo_script.json")
        print(f"\nTo view trace: npx playwright show-trace {OUT}/trace.zip")


if __name__ == "__main__":
    run()
