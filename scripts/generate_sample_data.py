"""Generate realistic Seatrium shipyard scheduling CSV data.

Produces a CSV with 40-80 rows representing 5-8 real offshore/marine vessel
projects across Seatrium Singapore yards, each with 3-6 sequential phases.
Output format matches the existing ai_plan_seatrium.csv convention.
"""

from __future__ import annotations

import csv
import sys
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Sequence

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "backend" / "tests" / "fixtures" / "sample_plans"
OUTPUT_FILE = OUTPUT_DIR / "seatrium_projects.csv"

CSV_HEADER = [
    "project_id",
    "project_name",
    "duration_days",
    "start_date",
    "end_date",
    "resource",
    "dependencies",
    "cost",
    "priority",
]

DATE_FMT = "%d-%m-%Y"


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

@dataclass
class Phase:
    """A single phase within a shipyard project."""

    name: str
    duration_days: int
    resource: str
    dependency: str  # name of the preceding phase, or empty string
    cost: int
    start_date: date = date.min
    end_date: date = date.min


@dataclass
class Project:
    """A shipyard project consisting of sequential phases."""

    project_id: str
    priority: str  # "Confirmed" or "Enquiry"
    phases: list[Phase] = field(default_factory=list)

    def schedule(self, anchor: date) -> None:
        """Compute start/end dates for all phases beginning at *anchor*."""
        cursor = anchor
        for phase in self.phases:
            phase.start_date = cursor
            phase.end_date = cursor + timedelta(days=phase.duration_days)
            # Next phase starts the day after this one ends (no gap).
            cursor = phase.end_date + timedelta(days=1)


# ---------------------------------------------------------------------------
# Project definitions
# ---------------------------------------------------------------------------

def _build_projects() -> list[Project]:
    """Define all projects with their phases, resources, and costs."""

    projects: list[Project] = []

    # --- 1. Neptune FPSO (Floating Production Storage Offloading) ----------
    p = Project("Neptune FPSO", "Confirmed")
    p.phases = [
        Phase("Hull Fabrication", 180, "Tuas Boulevard - YST D1", "", 12_500_000),
        Phase("Drydock Integration", 150, "Tuas Boulevard - YST D1", "Hull Fabrication", 9_800_000),
        Phase("Berthing & Outfitting", 210, "Tuas Boulevard - YST 01", "Drydock Integration", 15_200_000),
        Phase("Topside Module Integration", 120, "Benoi - Q2E", "Berthing & Outfitting", 18_500_000),
        Phase("Commissioning & Sea Trial", 60, "Tuas Boulevard - YST 01", "Topside Module Integration", 4_200_000),
    ]
    projects.append(p)

    # --- 2. Coral LNG Carrier ---------------------------------------------
    p = Project("Coral LNG Carrier", "Confirmed")
    p.phases = [
        Phase("Hull Fabrication", 160, "Tuas Boulevard - YST D2", "", 11_000_000),
        Phase("Tank Installation", 120, "Tuas Boulevard - YST D2", "Hull Fabrication", 22_000_000),
        Phase("Berthing & Outfitting", 180, "Tuas Boulevard - YST 09", "Tank Installation", 13_500_000),
        Phase("Cargo System Testing", 45, "Tuas Boulevard - YST 09", "Berthing & Outfitting", 3_800_000),
        Phase("Commissioning & Sea Trial", 50, "Tuas Boulevard - YST 09", "Cargo System Testing", 3_500_000),
    ]
    projects.append(p)

    # --- 3. Emerald Jack-Up Rig --------------------------------------------
    p = Project("Emerald Jack-Up Rig", "Confirmed")
    p.phases = [
        Phase("Hull Fabrication", 200, "Pioneer - Admiral Dock", "", 14_000_000),
        Phase("Leg Fabrication & Assembly", 150, "Benoi - Q3E", "Hull Fabrication", 19_000_000),
        Phase("Berthing & Outfitting", 160, "Pioneer - South Quay 1", "Leg Fabrication & Assembly", 11_500_000),
        Phase("Jacking System Testing", 40, "Pioneer - South Quay 1", "Berthing & Outfitting", 2_800_000),
        Phase("Loadout & Delivery", 30, "Pioneer - South Pier 1", "Jacking System Testing", 1_900_000),
    ]
    projects.append(p)

    # --- 4. Horizon Semi-Submersible ---------------------------------------
    p = Project("Horizon Semi-Sub", "Confirmed")
    p.phases = [
        Phase("Pontoon Fabrication", 170, "Tuas Boulevard - YST D3", "", 13_200_000),
        Phase("Column & Deck Fabrication", 140, "Tuas Boulevard - YST D4", "Pontoon Fabrication", 10_800_000),
        Phase("Drydock Integration", 130, "Tuas Boulevard - YST D3", "Column & Deck Fabrication", 8_500_000),
        Phase("Berthing & Outfitting", 200, "Tuas Boulevard - YST 11", "Drydock Integration", 16_000_000),
        Phase("Commissioning & Sea Trial", 55, "Tuas Boulevard - YST 11", "Berthing & Outfitting", 4_000_000),
    ]
    projects.append(p)

    # --- 5. Atlas Drillship ------------------------------------------------
    p = Project("Atlas Drillship", "Enquiry")
    p.phases = [
        Phase("Hull Fabrication", 190, "Tuas Boulevard - YST D5", "", 15_000_000),
        Phase("Drydock Integration", 140, "Tuas Boulevard - YST D5", "Hull Fabrication", 11_200_000),
        Phase("Berthing & Outfitting", 220, "Tuas Boulevard - YST 19", "Drydock Integration", 17_500_000),
        Phase("Derrick & Drilling Equipment", 90, "Tuas Boulevard - YST 19", "Berthing & Outfitting", 24_000_000),
        Phase("Commissioning & Sea Trial", 65, "Tuas Boulevard - YST 19", "Derrick & Drilling Equipment", 5_100_000),
    ]
    projects.append(p)

    # --- 6. Vanguard Pipe Layer --------------------------------------------
    p = Project("Vanguard Pipe Layer", "Enquiry")
    p.phases = [
        Phase("Hull Fabrication", 175, "Tuas - Raffles Dock", "", 12_000_000),
        Phase("Drydock Integration", 110, "Tuas - Raffles Dock", "Hull Fabrication", 7_800_000),
        Phase("Berthing & Pipe-lay System", 190, "Tuas - South Quay (SQ)", "Drydock Integration", 21_000_000),
        Phase("Tensioner & Stinger Install", 70, "Tuas - South Quay (SQ)", "Berthing & Pipe-lay System", 8_500_000),
        Phase("Commissioning & Sea Trial", 50, "Tuas - West Quay (WQ)", "Tensioner & Stinger Install", 3_600_000),
    ]
    projects.append(p)

    # --- 7. Pacific Voyager (Repair/Upgrade) --------------------------------
    p = Project("Pacific Voyager", "Confirmed")
    p.phases = [
        Phase("Docking & Survey", 30, "Admiralty - Republic (RFD)", "", 1_200_000),
        Phase("Hull Repair & Blasting", 60, "Admiralty - Republic (RFD)", "Docking & Survey", 3_500_000),
        Phase("Machinery Overhaul", 45, "Admiralty - B14", "Hull Repair & Blasting", 4_200_000),
        Phase("Undocking & Berthing", 90, "Admiralty - Finger Pier", "Machinery Overhaul", 6_000_000),
        Phase("Sea Trial & Delivery", 20, "Admiralty - Finger Pier", "Undocking & Berthing", 1_500_000),
    ]
    projects.append(p)

    # --- 8. Stellar Offshore Support Vessel --------------------------------
    p = Project("Stellar OSV", "Enquiry")
    p.phases = [
        Phase("Hull Fabrication", 130, "Nantong - Yard 1", "", 6_500_000),
        Phase("Superstructure Assembly", 80, "Nantong - Yard 2", "Hull Fabrication", 4_800_000),
        Phase("Outfitting", 100, "Pioneer - South Quay 2", "Superstructure Assembly", 5_200_000),
        Phase("DP System Integration", 35, "Pioneer - South Quay 2", "Outfitting", 3_100_000),
        Phase("Commissioning & Sea Trial", 30, "Pioneer - North Quay", "DP System Integration", 2_000_000),
    ]
    projects.append(p)

    return projects


def _assign_start_dates(projects: Sequence[Project]) -> None:
    """Set staggered project start dates across 2025-2028."""
    start_dates = [
        date(2025, 3, 1),   # Neptune FPSO
        date(2025, 6, 15),  # Coral LNG Carrier
        date(2025, 4, 1),   # Emerald Jack-Up Rig
        date(2025, 9, 1),   # Horizon Semi-Sub
        date(2026, 1, 10),  # Atlas Drillship
        date(2026, 4, 1),   # Vanguard Pipe Layer
        date(2025, 7, 1),   # Pacific Voyager
        date(2025, 11, 1),  # Stellar OSV
    ]
    for project, anchor in zip(projects, start_dates):
        project.schedule(anchor)


# ---------------------------------------------------------------------------
# CSV generation
# ---------------------------------------------------------------------------

def _write_csv(projects: Sequence[Project], path: Path) -> int:
    """Write all project phases to CSV. Returns total row count."""
    path.parent.mkdir(parents=True, exist_ok=True)

    row_count = 0
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(CSV_HEADER)

        for project in projects:
            for phase in project.phases:
                writer.writerow([
                    project.project_id,
                    phase.name,
                    phase.duration_days,
                    phase.start_date.strftime(DATE_FMT),
                    phase.end_date.strftime(DATE_FMT),
                    phase.resource,
                    phase.dependency,
                    phase.cost,
                    project.priority,
                ])
                row_count += 1

    return row_count


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def _print_summary(projects: Sequence[Project], row_count: int, path: Path) -> None:
    """Print a human-readable summary of generated data."""
    divider = "-" * 72

    print(divider)
    print("Seatrium Shipyard Scheduling Data - Generation Summary")
    print(divider)
    print(f"Output file : {path}")
    print(f"Total rows  : {row_count}")
    print(f"Projects    : {len(projects)}")
    print()

    for project in projects:
        earliest = min(ph.start_date for ph in project.phases)
        latest = max(ph.end_date for ph in project.phases)
        total_cost = sum(ph.cost for ph in project.phases)
        yards = sorted({ph.resource.split(" - ")[0] for ph in project.phases})

        print(f"  {project.project_id:<24s} [{project.priority}]")
        print(f"    Phases   : {len(project.phases)}")
        print(f"    Timeline : {earliest.strftime(DATE_FMT)} -> {latest.strftime(DATE_FMT)}")
        print(f"    Cost     : ${total_cost:,.0f}")
        print(f"    Yards    : {', '.join(yards)}")
        print()

    # Resource conflict report (same resource used by different projects)
    resource_usage: dict[str, list[tuple[str, date, date]]] = {}
    for project in projects:
        for phase in project.phases:
            resource_usage.setdefault(phase.resource, []).append(
                (project.project_id, phase.start_date, phase.end_date)
            )

    conflicts: list[str] = []
    for resource, usages in sorted(resource_usage.items()):
        if len(usages) < 2:
            continue
        # Check for any overlapping periods among different projects
        for i, (pid_a, start_a, end_a) in enumerate(usages):
            for pid_b, start_b, end_b in usages[i + 1:]:
                if pid_a != pid_b and start_a <= end_b and start_b <= end_a:
                    conflicts.append(
                        f"    {resource}: {pid_a} vs {pid_b} "
                        f"(overlap {max(start_a, start_b).strftime(DATE_FMT)} - "
                        f"{min(end_a, end_b).strftime(DATE_FMT)})"
                    )

    print(f"Resource reuse (same facility, different times): "
          f"{sum(len(v) for v in resource_usage.values() if len(v) > 1)} bookings")
    if conflicts:
        print(f"Resource conflicts detected ({len(conflicts)}):")
        for c in conflicts:
            print(c)
    else:
        print("No resource conflicts detected (sequential usage only).")
    print(divider)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    projects = _build_projects()
    _assign_start_dates(projects)
    row_count = _write_csv(projects, OUTPUT_FILE)
    _print_summary(projects, row_count, OUTPUT_FILE)


if __name__ == "__main__":
    main()
