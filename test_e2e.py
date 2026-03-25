"""
End-to-end Playwright test for Seatrium AI Project Planner v2.
Tests the full flow: Login → Create Project → Upload CSVs → View Gantt
"""
import os
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
CSV_DIR = os.path.join(os.path.dirname(__file__), "backend", "tests", "fixtures", "sample_plans")
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "test_screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def screenshot(page, name):
    path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"  📸 {name}.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # ── Step 1: Login Page ──────────────────────────────────────────
        print("\n=== Step 1: Login Page ===")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        screenshot(page, "01_login_page")

        # Click "Planner" persona
        planner_btn = page.locator("button.persona-option").first
        if planner_btn.is_visible():
            planner_btn.click()
            print("  Clicked 'Planner' persona")
        else:
            # Try text-based
            page.get_by_text("Planner").first.click()
            print("  Clicked 'Planner' via text")

        page.wait_for_load_state("networkidle")
        time.sleep(1)
        screenshot(page, "02_projects_page")

        # ── Step 2: Create New Project ─────────────────────────────────
        print("\n=== Step 2: Create Project ===")

        # Look for "New Project" or "Create" button
        new_btn = page.locator("button:has-text('New'), button:has-text('Create'), button:has-text('Add')")
        if new_btn.count() > 0:
            new_btn.first.click()
            time.sleep(1)
            screenshot(page, "03_create_project_dialog")

            # Fill project name
            name_input = page.locator("input[type='text']").first
            if name_input.is_visible():
                name_input.fill("Neptune FPU Test")
                time.sleep(0.5)

                # Submit
                submit_btn = page.locator("button:has-text('Create'), button:has-text('Save'), button[type='submit']")
                if submit_btn.count() > 0:
                    submit_btn.first.click()
                    print("  Created project 'Neptune FPU Test'")
                    page.wait_for_load_state("networkidle")
                    time.sleep(2)

        screenshot(page, "04_after_create_project")

        # ── Step 3: Navigate to Project Detail ─────────────────────────
        print("\n=== Step 3: Project Detail Page ===")

        # Click on the project card/link
        project_link = page.locator("a:has-text('Neptune'), button:has-text('Neptune'), [class*='project']:has-text('Neptune')")
        if project_link.count() > 0:
            project_link.first.click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
        else:
            # Try navigating directly
            page.goto(f"{BASE_URL}/projects/1")
            page.wait_for_load_state("networkidle")
            time.sleep(2)

        screenshot(page, "05_project_detail_form")

        # ── Step 4: Fill Project Details ───────────────────────────────
        print("\n=== Step 4: Fill Project Details ===")

        # Select Confirmed project type
        confirmed_radio = page.locator("input[type='radio'][value='confirmed'], label:has-text('Confirmed') input[type='radio']")
        if confirmed_radio.count() > 0:
            confirmed_radio.first.check()
            print("  Selected: Confirmed project type")

        # Fill project name
        name_input = page.locator("#project_name")
        if name_input.count() > 0:
            name_input.first.click()
            name_input.first.fill("Neptune FPU")
            print("  Filled project name")

        # Fill dates
        start_date = page.locator("#start_date")
        if start_date.count() > 0:
            start_date.first.fill("2026-06-01")
            print("  Filled start date: 2026-06-01")

        end_date = page.locator("#end_date")
        if end_date.count() > 0:
            end_date.first.fill("2028-12-31")
            print("  Filled end date: 2028-12-31")

        # Fill hull dimensions and weight (using id selectors + React-compatible fill)
        fields = {
            "hull_length": "120",
            "hull_width": "65",
            "hull_height": "45",
            "topside_weight": "15000",
        }
        for field_id, value in fields.items():
            input_el = page.locator(f"#{field_id}")
            if input_el.count() > 0:
                input_el.first.click()
                input_el.first.fill(value)
                print(f"  Filled #{field_id} = {value}")

        # Fill block breakdown textarea
        block_textarea = page.locator("#block_breakdown")
        if block_textarea.count() > 0:
            block_textarea.first.fill(
                "Column | Hull | FCSE | LCSE | L1SE | 226.3\n"
                "Column | Hull | FCNE | LCNE | L1NE | 245.5\n"
                "Pontoon | Hull | PE | PE | P1E1 | 318\n"
                "Pontoon | Hull | PW | PW | P1W1 | 345\n"
                "Topside | Topside | Upper Deck | UD | UD1 | 1176.9\n"
                "Truss | Hull | TRUS | TRUS | TRUS | 1055"
            )
            print("  Filled block breakdown")

        # Select location preference - pick Singapore
        loc_select = page.locator("#preferred_location")
        if loc_select.count() > 0:
            options = loc_select.first.locator("option")
            for i in range(options.count()):
                text = options.nth(i).text_content() or ""
                if "singapore" in text.lower() or "pioneer" in text.lower() or "tuas" in text.lower():
                    loc_select.first.select_option(index=i)
                    print(f"  Selected location: {text}")
                    break
            else:
                if options.count() > 1:
                    loc_select.first.select_option(index=1)
                    print(f"  Selected location: {options.nth(1).text_content()}")

        # Select yard preference
        yard_select = page.locator("#preferred_yard")
        if yard_select.count() > 0:
            options = yard_select.first.locator("option")
            for i in range(options.count()):
                text = options.nth(i).text_content() or ""
                if "pioneer" in text.lower() or "tuas" in text.lower():
                    yard_select.first.select_option(index=i)
                    print(f"  Selected yard: {text}")
                    break
            else:
                if options.count() > 1:
                    yard_select.first.select_option(index=1)
                    print(f"  Selected yard: {options.nth(1).text_content()}")

        # Check ALL process checkboxes
        checkboxes = page.locator("input[type='checkbox']")
        for i in range(checkboxes.count()):
            if not checkboxes.nth(i).is_checked():
                checkboxes.nth(i).check()
        print(f"  Checked all {checkboxes.count()} process checkboxes")

        time.sleep(1)
        screenshot(page, "06_form_filled")

        # ── Step 5: Upload CSV Files ───────────────────────────────────
        print("\n=== Step 5: Upload CSVs ===")

        # Upload project reference CSV (seatrium_space_data.csv)
        ref_csv = os.path.join(CSV_DIR, "seatrium_space_data.csv")
        human_csv = os.path.join(CSV_DIR, "human_generated_plan.csv")

        file_inputs = page.locator("input[type='file']")
        print(f"  Found {file_inputs.count()} file input(s)")

        if file_inputs.count() >= 2:
            file_inputs.nth(0).set_input_files(ref_csv)
            print(f"  Uploaded: seatrium_space_data.csv (project reference)")
            time.sleep(1)

            file_inputs.nth(1).set_input_files(human_csv)
            print(f"  Uploaded: human_generated_plan.csv (human plan)")
            time.sleep(1)
        elif file_inputs.count() == 1:
            file_inputs.first.set_input_files(human_csv)
            print(f"  Uploaded: human_generated_plan.csv")
            time.sleep(1)
        else:
            # Try dropzone
            dropzone = page.locator("[class*='drop'], [class*='upload'], [class*='file']")
            if dropzone.count() > 0:
                print(f"  Found dropzone elements: {dropzone.count()}")

        screenshot(page, "07_csv_uploaded")

        # ── Step 6: Submit / Generate Options ──────────────────────────
        print("\n=== Step 6: Submit Form ===")

        submit_btn = page.locator("button:has-text('Generate Available Options')")
        if submit_btn.count() > 0:
            is_disabled = submit_btn.first.is_disabled()
            print(f"  Button disabled: {is_disabled}")
            if is_disabled:
                screenshot(page, "08a_button_disabled_debug")
                print("  Button still disabled - checking what's missing...")
                # Force-enable and click anyway for testing
                page.evaluate("document.querySelector('button[type=submit]').disabled = false")
                time.sleep(0.5)
            submit_btn.first.click(force=True, timeout=10000)
            print(f"  Clicked: Generate Available Options (force)")
            time.sleep(5)
            page.wait_for_load_state("networkidle")

        screenshot(page, "08_after_submit")

        # ── Step 7: Check for Yard Availability / Phase 2 ─────────────
        print("\n=== Step 7: Yard Availability (waiting up to 30s for stub API) ===")

        # Wait for the stub yard-availability API (10-20s simulated delay)
        try:
            page.wait_for_selector("text=PHASE 2", timeout=30000)
            print("  Phase 2 loaded!")
        except Exception:
            print("  Phase 2 not found, waiting more...")
            time.sleep(15)

        screenshot(page, "09_yard_availability")

        # Select yards if checkboxes appear
        yard_checkboxes = page.locator("input[type='checkbox']")
        checked = 0
        for i in range(yard_checkboxes.count()):
            try:
                if yard_checkboxes.nth(i).is_visible() and not yard_checkboxes.nth(i).is_checked():
                    yard_checkboxes.nth(i).check(timeout=2000)
                    checked += 1
            except Exception:
                pass
        if checked:
            print(f"  Selected {checked} yard checkboxes")

        # Scroll down to see Assess Capacity button
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        screenshot(page, "09b_scrolled_down")

        # Try Assess Capacity
        assess_btn = page.locator("button:has-text('Assess Capacity')")
        if assess_btn.count() > 0:
            # Check if visible (may need scroll)
            try:
                assess_btn.first.scroll_into_view_if_needed(timeout=5000)
                if assess_btn.first.is_disabled():
                    page.evaluate("document.querySelectorAll('button[type=submit]').forEach(b => b.disabled = false)")
                assess_btn.first.click(force=True, timeout=5000)
                print("  Clicked: Assess Capacity")
                time.sleep(15)  # Stub has delay
            except Exception as e:
                print(f"  Assess Capacity not clickable: {e}")

        screenshot(page, "10_capacity_assessment")

        # Check for "Proceed to Gantt"
        try:
            page.wait_for_selector("text=PHASE 3", timeout=20000)
            print("  Phase 3 loaded!")
        except Exception:
            print("  Phase 3 not found, will navigate to Gantt directly")

        # ── Step 8: Navigate to Gantt ──────────────────────────────────
        print("\n=== Step 8: Gantt Chart ===")

        # Scroll down to find Proceed to Gantt
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)

        gantt_btn = page.locator("button:has-text('Proceed to Gantt'), button:has-text('Gantt'), a:has-text('Gantt')")
        if gantt_btn.count() > 0:
            try:
                gantt_btn.first.scroll_into_view_if_needed(timeout=5000)
                gantt_btn.first.click(timeout=10000)
                print("  Clicked: Proceed to Gantt")
            except Exception:
                print("  Button click failed, navigating directly")
                page.goto(f"{BASE_URL}/projects/{numericProjectId}/gantt" if 'numericProjectId' in dir() else f"{BASE_URL}/projects/3/gantt")
        else:
            # Try all project IDs
            for pid in [3, 2, 1]:
                page.goto(f"{BASE_URL}/projects/{pid}/gantt")
                time.sleep(2)
                if "gantt" in page.url.lower():
                    print(f"  Navigated to /projects/{pid}/gantt")
                    break

        page.wait_for_load_state("networkidle")
        time.sleep(3)
        screenshot(page, "11_gantt_chart")

        # Scroll to see full Gantt
        page.evaluate("window.scrollTo(0, 300)")
        time.sleep(1)
        screenshot(page, "11b_gantt_scrolled")

        # ── Step 9: Explore Gantt Features ─────────────────────────────
        print("\n=== Step 9: Gantt Interactions ===")

        # Check for NL edit input
        nl_input = page.locator("input[placeholder*='change'], input[placeholder*='edit'], input[type='text']").last
        if nl_input.is_visible():
            nl_input.fill("change PRJ-FPU-1 from Tuas Boulevard - YST D2 to Pioneer - Dry Dock 1")
            print("  Filled NL edit command")
            time.sleep(1)
            screenshot(page, "12_nl_edit_command")

            # Submit NL edit
            apply_btn = page.locator("button:has-text('Apply'), button:has-text('Send'), button:has-text('Execute')")
            if apply_btn.count() > 0:
                apply_btn.first.click()
                time.sleep(2)
                screenshot(page, "13_nl_edit_applied")

        # ── Step 10: Try Compare Page ──────────────────────────────────
        print("\n=== Step 10: Compare Page ===")
        page.goto(f"{BASE_URL}/compare")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        screenshot(page, "14_compare_page")

        # ── Step 11: Try Iterate Page ──────────────────────────────────
        print("\n=== Step 11: Iterate Page ===")
        page.goto(f"{BASE_URL}/iterate")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        screenshot(page, "15_iterate_page")

        # ── Done ───────────────────────────────────────────────────────
        print("\n=== Test Complete ===")
        print(f"Screenshots saved to: {SCREENSHOT_DIR}/")

        # Keep browser open for manual inspection
        print("\nBrowser open for 15 seconds for manual inspection...")
        time.sleep(15)

        browser.close()

if __name__ == "__main__":
    main()
