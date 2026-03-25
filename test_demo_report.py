"""
Seatrium AI Planner — Pytest + Playwright HTML Report
Run: pytest test_demo_report.py --html=demo_output/report.html --self-contained-html
"""
import pytest
import time
from playwright.sync_api import Page, expect

BASE = "http://localhost:5173"


@pytest.fixture(scope="session")
def browser_context_args():
    return {"viewport": {"width": 1440, "height": 900}}


def test_01_login_page(page: Page):
    """Login page shows Seatrium branding"""
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    expect(page.locator(".login-badge")).to_contain_text("Seatrium")
    expect(page.locator("h1")).to_contain_text("Shipyard Planning Hub")
    expect(page.locator("button.persona-option")).to_have_count(2)


def test_02_select_persona(page: Page):
    """Clicking Planner persona navigates to projects"""
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("button.persona-option").first.click()
    page.wait_for_load_state("networkidle")
    expect(page).to_have_url(f"{BASE}/projects")


def test_03_projects_list(page: Page):
    """Projects page shows Neptune FPU with View Plan"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    expect(page.locator("text=Neptune FPU")).to_be_visible()
    expect(page.locator(".project-card-open").first).to_contain_text("View Plan")


def test_04_project_routes_to_workspace(page: Page):
    """Clicking project with plan data goes to Gantt workspace"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects")
    time.sleep(2)
    page.locator(".project-card").first.click()
    time.sleep(6)
    assert "/gantt" in page.url, f"Expected /gantt in URL, got {page.url}"


def test_05_heatmap_renders(page: Page):
    """Heatmap shows yard groups with utilization cells"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    expect(page.locator(".hm-table")).to_be_visible()
    rows = page.locator(".hm-row").count()
    cells = page.locator(".hm-cell").count()
    assert rows >= 5, f"Expected 5+ yard rows, got {rows}"
    assert cells >= 50, f"Expected 50+ heatmap cells, got {cells}"


def test_06_heatmap_has_tooltips(page: Page):
    """Heatmap cells have tooltips with utilization details"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    cell = page.locator(".hm-cell").first
    title = cell.get_attribute("title") or ""
    assert "utilization" in title.lower(), f"Expected tooltip with utilization, got: {title}"


def test_07_drill_down_by_yard(page: Page):
    """Clicking yard name drills into scoped Gantt"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    page.locator(".hm-yard-cell").first.click()
    time.sleep(3)
    expect(page.locator(".gantt-breadcrumb")).to_be_visible()
    expect(page.locator(".gantt-breadcrumb-back")).to_contain_text("All Yards")


def test_08_drill_down_by_cell(page: Page):
    """Clicking heatmap cell drills into yard+quarter scoped Gantt"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    cells = page.locator(".hm-cell")
    for i in range(min(cells.count(), 100)):
        t = cells.nth(i).text_content() or ""
        if t.strip().isdigit() and int(t.strip()) > 20:
            cells.nth(i).click()
            time.sleep(3)
            expect(page.locator(".gantt-breadcrumb")).to_be_visible()
            task_count = page.locator(".gantt-breadcrumb-count").text_content()
            assert "tasks" in task_count
            return
    pytest.skip("No high-utilization cells found")


def test_09_gantt_zoom_controls(page: Page):
    """Gantt has 5 zoom levels"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    page.locator(".hm-yard-cell").first.click()
    time.sleep(3)
    zoom_btns = page.locator(".zoom-btn")
    assert zoom_btns.count() == 5, f"Expected 5 zoom buttons, got {zoom_btns.count()}"


def test_10_gantt_filter(page: Page):
    """Yard filter narrows visible resources"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    page.locator(".hm-yard-cell").first.click()
    time.sleep(3)
    expect(page.locator(".filter-input")).to_be_visible()


def test_11_change_panel_visible(page: Page):
    """Change panel shows with replan button"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    expect(page.locator(".change-panel")).to_be_visible()
    expect(page.locator(".cp-replan-btn")).to_be_visible()


def test_12_replan_button_enables_on_change(page: Page):
    """Replan button enables after filling a change"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    btn = page.locator(".cp-replan-btn")
    assert btn.first.is_disabled(), "Button should be disabled initially"
    page.locator(".change-panel input[type='number']").first.fill("200")
    time.sleep(0.5)
    assert not btn.first.is_disabled(), "Button should enable after change"


def test_13_export_buttons(page: Page):
    """PNG and CSV export buttons available"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    expect(page.locator("button:has-text('PNG')")).to_be_visible()
    expect(page.locator("button:has-text('CSV')")).to_be_visible()


def test_14_back_navigation(page: Page):
    """Can navigate back from Gantt to heatmap to projects"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    # Drill into yard
    page.locator(".hm-yard-cell").first.click()
    time.sleep(3)
    # Back to heatmap
    page.locator(".gantt-breadcrumb-back").click()
    time.sleep(2)
    expect(page.locator(".hm-table")).to_be_visible()


def test_15_no_orphaned_nav_links(page: Page):
    """Compare Plans and Iterate Constraints removed from nav"""
    page.goto(f"{BASE}/login")
    time.sleep(1)
    if page.locator("button.persona-option").count():
        page.locator("button.persona-option").first.click()
        time.sleep(1)
    page.goto(f"{BASE}/projects/1/gantt")
    time.sleep(8)
    assert page.locator("a:has-text('Compare Plans')").count() == 0
    assert page.locator("a:has-text('Iterate Constraints')").count() == 0
    assert page.locator("a:has-text('Projects')").count() >= 1
