import React, { useMemo, useState } from 'react';
import './YardSummaryDashboard.css';
import type { CapacityPlanRow } from '../services/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface Quarter { year: number; q: number; label: string; start: Date; end: Date; }

interface YardHeatRow {
  name: string;
  locationCount: number;
  taskCount: number;
  avgUtilization: number;
  cells: Map<string, { utilization: number; taskCount: number }>; // key = "2024-Q1"
}

export interface DrillDownTarget {
  yardPrefix: string;
  quarterStart: Date;
  quarterEnd: Date;
  label: string;
}

interface YardSummaryDashboardProps {
  planData: CapacityPlanRow[];
  onDrillDown: (target: DrillDownTarget) => void;
  onSelectYard: (yardPrefix: string) => void;
  selectedYard: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(d: string): Date | null {
  if (!d) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    }
    if (/^\d{2}-\d{2}-\d{4}/.test(d)) {
      const [day, m, y] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    }
  } catch {}
  return null;
}

function generateQuarters(minDate: Date, maxDate: Date): Quarter[] {
  const quarters: Quarter[] = [];
  const cur = new Date(minDate.getFullYear(), Math.floor(minDate.getMonth() / 3) * 3, 1);
  while (cur <= maxDate) {
    const year = cur.getFullYear();
    const q = Math.floor(cur.getMonth() / 3) + 1;
    const start = new Date(cur);
    const end = new Date(year, cur.getMonth() + 3, 0); // last day of quarter
    quarters.push({ year, q, label: `Q${q}'${String(year).slice(2)}`, start, end });
    cur.setMonth(cur.getMonth() + 3);
  }
  return quarters;
}

function utilizationColor(pct: number): string {
  if (pct <= 0) return 'rgba(255,255,255,0.03)';
  if (pct < 25) return 'rgba(34,197,94,0.25)';   // green light
  if (pct < 50) return 'rgba(34,197,94,0.5)';     // green
  if (pct < 70) return 'rgba(245,158,11,0.45)';   // amber
  if (pct < 85) return 'rgba(245,158,11,0.7)';    // amber strong
  if (pct < 95) return 'rgba(239,68,68,0.6)';     // red
  return 'rgba(239,68,68,0.85)';                    // red hot
}

function utilizationTextColor(pct: number): string {
  if (pct <= 0) return 'rgba(255,255,255,0.15)';
  if (pct < 50) return 'rgba(255,255,255,0.7)';
  return '#fff';
}

// ── Component ────────────────────────────────────────────────────────────────

export const YardSummaryDashboard: React.FC<YardSummaryDashboardProps> = ({
  planData,
  onDrillDown,
  onSelectYard,
  selectedYard,
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'utilization' | 'tasks'>('utilization');

  // Compute global date range and quarters
  const { quarters, yardRows, totalTasks, totalLocations } = useMemo(() => {
    let globalMin = Infinity;
    let globalMax = -Infinity;

    // Group tasks by yard prefix
    const groups = new Map<string, { locations: Set<string>; tasks: { row: CapacityPlanRow; start: Date; end: Date }[] }>();

    for (const row of planData) {
      const resource = row.resource || 'Unknown';
      const prefix = resource.split(' - ')[0].trim();
      const start = parseDate(row.start_date);
      const end = parseDate(row.end_date);
      if (!start || !end) continue;

      if (!groups.has(prefix)) groups.set(prefix, { locations: new Set(), tasks: [] });
      const g = groups.get(prefix)!;
      g.locations.add(resource);
      g.tasks.push({ row, start, end });

      globalMin = Math.min(globalMin, start.getTime());
      globalMax = Math.max(globalMax, end.getTime());
    }

    if (!isFinite(globalMin)) globalMin = new Date(2024, 0, 1).getTime();
    if (!isFinite(globalMax)) globalMax = new Date(2028, 0, 1).getTime();

    const quarters = generateQuarters(new Date(globalMin), new Date(globalMax));

    // Build heatmap rows
    const yardRows: YardHeatRow[] = [];
    let totalTasks = 0;
    let totalLocations = 0;

    for (const [name, { locations, tasks }] of groups) {
      const cells = new Map<string, { occupiedDays: number; taskCount: number }>();

      // Initialize all quarters
      for (const q of quarters) {
        cells.set(q.label, { occupiedDays: 0, taskCount: 0 });
      }

      // Accumulate task overlap per quarter
      for (const { start, end } of tasks) {
        for (const q of quarters) {
          const overlapStart = Math.max(start.getTime(), q.start.getTime());
          const overlapEnd = Math.min(end.getTime(), q.end.getTime());
          if (overlapStart < overlapEnd) {
            const days = (overlapEnd - overlapStart) / 86_400_000;
            const cell = cells.get(q.label)!;
            cell.occupiedDays += days;
            cell.taskCount += 1;
          }
        }
      }

      // Convert to utilization percentages
      const daysPerQuarter = 90;
      const capacity = locations.size * daysPerQuarter;
      const utilCells = new Map<string, { utilization: number; taskCount: number }>();
      let totalUtil = 0;

      for (const [key, { occupiedDays, taskCount }] of cells) {
        const util = capacity > 0 ? Math.min(100, Math.round((occupiedDays / capacity) * 100)) : 0;
        utilCells.set(key, { utilization: util, taskCount });
        totalUtil += util;
      }

      const avgUtil = quarters.length > 0 ? Math.round(totalUtil / quarters.length) : 0;

      yardRows.push({
        name,
        locationCount: locations.size,
        taskCount: tasks.length,
        avgUtilization: avgUtil,
        cells: utilCells,
      });

      totalTasks += tasks.length;
      totalLocations += locations.size;
    }

    // Sort
    if (sortBy === 'utilization') yardRows.sort((a, b) => b.avgUtilization - a.avgUtilization);
    else if (sortBy === 'tasks') yardRows.sort((a, b) => b.taskCount - a.taskCount);
    else yardRows.sort((a, b) => a.name.localeCompare(b.name));

    return { quarters, yardRows, totalTasks, totalLocations };
  }, [planData, sortBy]);

  const handleCellClick = (yardName: string, quarter: Quarter) => {
    onDrillDown({
      yardPrefix: yardName,
      quarterStart: quarter.start,
      quarterEnd: quarter.end,
      label: `${yardName} · ${quarter.label}`,
    });
  };

  return (
    <div className="yard-dashboard">
      {/* Header */}
      <div className="yd-header">
        <div>
          <h3>Yard Capacity Heatmap</h3>
          <p className="yd-subtitle">
            {yardRows.length} yard groups · {totalLocations} locations · {totalTasks} tasks
            &nbsp;·&nbsp; Click any cell to drill down
          </p>
        </div>
        <div className="yd-sort">
          <span className="yd-sort-label">Sort:</span>
          {(['utilization', 'tasks', 'name'] as const).map((s) => (
            <button
              key={s}
              className={`yd-sort-btn ${sortBy === s ? 'yd-sort-btn--active' : ''}`}
              onClick={() => setSortBy(s)}
            >{s === 'utilization' ? 'Utilization' : s === 'tasks' ? 'Tasks' : 'Name'}</button>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="hm-container">
        <table className="hm-table">
          <thead>
            <tr>
              <th className="hm-yard-header">Yard</th>
              <th className="hm-avg-header">Avg</th>
              {quarters.map((q) => (
                <th key={q.label} className={`hm-q-header ${q.q === 1 ? 'hm-q-header--year' : ''}`}>
                  {q.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yardRows.map((row) => {
              const avgColor = row.avgUtilization > 85 ? '#ef4444' : row.avgUtilization > 60 ? '#f59e0b' : '#22c55e';
              return (
                <tr key={row.name} className={`hm-row ${selectedYard === row.name ? 'hm-row--selected' : ''}`}>
                  <td className="hm-yard-cell" onClick={() => onSelectYard(row.name)}>
                    <span className="hm-yard-name">{row.name}</span>
                    <span className="hm-yard-meta">{row.locationCount} loc · {row.taskCount} tasks</span>
                  </td>
                  <td className="hm-avg-cell">
                    <span className="hm-avg-badge" style={{ color: avgColor }}>{row.avgUtilization}%</span>
                  </td>
                  {quarters.map((q) => {
                    const cell = row.cells.get(q.label);
                    const util = cell?.utilization ?? 0;
                    const tasks = cell?.taskCount ?? 0;
                    return (
                      <td
                        key={q.label}
                        className="hm-cell"
                        style={{ background: utilizationColor(util) }}
                        onClick={() => handleCellClick(row.name, q)}
                        title={`${row.name} · ${q.label}: ${util}% utilization, ${tasks} tasks`}
                      >
                        <span className="hm-cell-text" style={{ color: utilizationTextColor(util) }}>
                          {util > 0 ? `${util}` : ''}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="hm-legend">
        <span className="hm-legend-label">Utilization:</span>
        <span className="hm-legend-swatch" style={{ background: 'rgba(255,255,255,0.03)' }}>0%</span>
        <span className="hm-legend-swatch" style={{ background: 'rgba(34,197,94,0.35)' }}>25%</span>
        <span className="hm-legend-swatch" style={{ background: 'rgba(245,158,11,0.5)' }}>50%</span>
        <span className="hm-legend-swatch" style={{ background: 'rgba(245,158,11,0.75)' }}>75%</span>
        <span className="hm-legend-swatch" style={{ background: 'rgba(239,68,68,0.7)' }}>90%+</span>
      </div>
    </div>
  );
};
