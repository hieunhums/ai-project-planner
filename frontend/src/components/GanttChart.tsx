import React, { useMemo, useRef, useState, useEffect } from 'react';
import './GanttChart.css';
import type { CapacityPlanRow } from '../services/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GanttEntry {
  project_id: string;
  project_name: string;
  resource: string;
  start: Date;
  end: Date;
  priority: string;
  source: 'human' | 'ai';
  _strokeOverride?: string;
}

interface TooltipInfo { x: number; y: number; entry: GanttEntry; }

export interface GanttChartProps {
  /** AI capacity-assessment plan rows (orange bars) */
  planData?: CapacityPlanRow[];
  /** Human-uploaded baseline plan rows (blue bars) */
  humanPlanData?: CapacityPlanRow[];
  /** Called when a bar is dragged to a new resource row */
  onBarRowChange?: (projectId: string, newResource: string) => Promise<void>;
  /** Called when a bar is dragged horizontally (date shift) */
  onBarDateShift?: (projectId: string, deltaDays: number) => Promise<void>;
  /** Called when a drag is rejected (guard violation) */
  onDragError?: (message: string) => void;
}

// ── Date parsing (dd-MM-yyyy  OR  YYYY-MM-DD) ─────────────────────────────────

const parseFlexDate = (d: string): Date | null => {
  if (!d || typeof d !== 'string' || d.trim() === '') return null;
  
  try {
    let year: number, month: number, day: number;
    
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
      // ISO format: YYYY-MM-DD
      [year, month, day] = d.split('-').map(Number);
    } else if (/^\d{2}-\d{2}-\d{4}/.test(d)) {
      // DD-MM-YYYY format
      [day, month, year] = d.split('-').map(Number);
    } else {
      return null;
    }

    // Validate the parsed numbers
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    
    const date = new Date(year, month - 1, day);
    
    // Verify the date is valid and in a reasonable range
    if (!Number.isFinite(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
      return null;
    }
    
    return date;
  } catch {
    return null;
  }
};

// ── Row converter ─────────────────────────────────────────────────────────────

const rowToEntry = (row: CapacityPlanRow, source: 'human' | 'ai'): GanttEntry | null => {
  const start = parseFlexDate(row.start_date ?? '');
  const end = parseFlexDate(row.end_date ?? '');
  
  // Filter out rows with invalid dates
  if (!start || !end) {
    return null;
  }
  
  return {
    project_id:   row.project_id   ?? '',
    project_name: row.project_name ?? '',
    resource:     row.resource     ?? 'Unknown',
    start,
    end,
    priority:     row.priority     ?? 'Med',
    source,
  };
};

// (Static fallback data removed — all data comes from props)

// ── Layout constants ──────────────────────────────────────────────────────────

// PX_PER_DAY is now dynamic via zoom state (see ZOOM_LEVELS)

const ROW_HEIGHT  = 64;
const BAR_HEIGHT  = 18;
const BAR_GAP     =  3;
const ROW_PAD_TOP =  6;

/** Vertical offset for AI bars so they sit below human bars in the same row */
const AI_Y_OFFSET = BAR_HEIGHT + 4;
// Layout constants
const M_LEFT      = 20;  // Reduced since Y-axis is now external
const M_TOP       = 54;
const M_RIGHT     = 20;
const M_BOTTOM    = 24;

const HUMAN_COLOR = '#3a86ff';
const AI_COLOR    = '#ff9f1c';

// Project color palette — distinct hues for up to 12 projects
const PROJECT_COLORS = [
  '#e07a2f', // warm orange
  '#3a86ff', // blue
  '#10b981', // emerald
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#ef4444', // red
];

const PROJECT_STROKES = [
  '#b85d1a',
  '#1a56c4',
  '#059669',
  '#be123c',
  '#6d28d9',
  '#0891b2',
  '#d97706',
  '#be185d',
  '#0d9488',
  '#4338ca',
  '#65a30d',
  '#dc2626',
];

function buildProjectColorMap(entries: GanttEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  let idx = 0;
  for (const e of entries) {
    if (!map.has(e.project_id)) {
      map.set(e.project_id, idx % PROJECT_COLORS.length);
      idx++;
    }
  }
  return map;
}

const fmt = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Geometry factories (accept runtime values) ────────────────────────────────

function makeDateToX(chartStart: Date, scale: number = 1.6): (d: Date) => number {
  const startTime = chartStart.getTime();

  if (!Number.isFinite(startTime)) {
    return () => M_LEFT;
  }

  return (d) => {
    const dTime = d.getTime();
    if (!Number.isFinite(dTime)) return M_LEFT;
    const xValue = M_LEFT + ((dTime - startTime) / 86_400_000) * scale;
    return Number.isFinite(xValue) ? xValue : M_LEFT;
  };
}

function makeResourceBaseY(resources: string[]): (res: string) => number {
  return (res) => M_TOP + Math.max(0, resources.indexOf(res)) * ROW_HEIGHT;
}

function assignSubRows(
  entries: GanttEntry[],
  resources: string[],
  dateToX: (d: Date) => number,
): Map<number, number> {
  const laneEnd = new Map<string, number[]>();
  resources.forEach((r) => laneEnd.set(r, []));
  const result = new Map<number, number>();
  entries.forEach((e, i) => {
    const startX = dateToX(e.start);
    const endX   = dateToX(e.end);
    const slots  = laneEnd.get(e.resource) ?? [];
    if (!laneEnd.has(e.resource)) laneEnd.set(e.resource, slots);
    let slot = slots.findIndex((ex) => ex < startX - 2);
    if (slot === -1) { slot = slots.length; slots.push(endX); }
    else { slots[slot] = endX; }
    result.set(i, slot);
  });
  return result;
}

function generateMonthTicks(chartStart: Date, chartEnd: Date) {
  const ticks: { date: Date; label: string; isQuarter: boolean }[] = [];
  const cur = new Date(chartStart);
  while (cur <= chartEnd) {
    const isQuarter = cur.getMonth() % 3 === 0;
    const label = isQuarter
      ? cur.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
      : cur.toLocaleString('en-GB', { month: 'short' });
    ticks.push({ date: new Date(cur), label, isQuarter });
    cur.setMonth(cur.getMonth() + 1);
  }
  return ticks;
}

// ── Bar ───────────────────────────────────────────────────────────────────────

interface BarProps {
  entry: GanttEntry;
  subRow: number;
  /** Extra vertical offset within the row (px) — used to separate human/AI bar lanes */
  yOffset?: number;
  colorOverride?: string;
  onHover: (info: TooltipInfo | null) => void;
  dateToX: (d: Date) => number;
  resourceBaseY: (res: string) => number;
  onBarDragStart?: (entry: GanttEntry, e: React.DragEvent<SVGGElement>) => void;
}

const Bar: React.FC<BarProps> = ({ entry, subRow, yOffset = 0, colorOverride, onHover, dateToX, resourceBaseY, onBarDragStart = undefined }) => {
  const x      = dateToX(entry.start);
  const endX   = dateToX(entry.end);
  const width  = Math.max(endX - x, 4);
  const baseY  = resourceBaseY(entry.resource);
  const y      = baseY + ROW_PAD_TOP + subRow * (BAR_HEIGHT + BAR_GAP) + yOffset;
  const fill   = colorOverride ?? (entry.source === 'human' ? HUMAN_COLOR : AI_COLOR);
  const stroke = entry._strokeOverride ?? (entry.source === 'ai' ? '#c97000' : '#1a56c4');
  const opacity = entry.source === 'human' ? 0.78 : 0.9;

  // Guard against invalid calculations
  if (!Number.isFinite(x) || !Number.isFinite(width) || !Number.isFinite(y)) {
    return null;
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <g
      className="gantt-bar-group"
      {...(onBarDragStart ? { draggable: true } as any : {})}
      onDragStart={onBarDragStart ? (e) => onBarDragStart(entry, e) : undefined}
      onMouseEnter={(e) => onHover({ x: e.clientX, y: e.clientY, entry })}
      onMouseLeave={() => onHover(null)}
    >
      <rect
        x={x} y={y} width={width} height={BAR_HEIGHT}
        rx={5} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={1}
        className="gantt-bar"
      />
      {width > 40 && (
        <text
          x={x + 6} y={y + BAR_HEIGHT / 2 + 1}
          textAnchor="start" dominantBaseline="middle"
          fontSize={9} fontWeight="700" fill="white"
          clipPath={`inset(0 0 0 0)`}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <tspan>{(() => {
            const label = `${entry.project_id} ${entry.project_name}`;
            const charsPerPx = 0.14;
            const maxChars = Math.floor((width - 12) * charsPerPx);
            return maxChars >= label.length ? label : label.slice(0, Math.max(maxChars - 1, 3)) + '…';
          })()}</tspan>
        </text>
      )}
    </g>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const ZOOM_LEVELS = [
  { label: 'Fit',     pxPerDay: 1.2 },
  { label: 'Year',    pxPerDay: 1.8 },
  { label: 'Quarter', pxPerDay: 4.0 },
  { label: 'Month',   pxPerDay: 8.0 },
  { label: 'Week',    pxPerDay: 20.0 },
];

const GanttChart: React.FC<GanttChartProps> = ({
  planData,
  humanPlanData,
  onBarRowChange,
  onBarDateShift,
  onDragError,
}) => {
  const [showAI, setShowAI] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoomIdx, setZoomIdx] = useState(1); // default = Year
  const pxPerDay = ZOOM_LEVELS[zoomIdx].pxPerDay;
  const [resourceFilter, setResourceFilter] = useState('');

  // Virtual scrolling: only render visible rows
  const VISIBLE_BUFFER = 5; // extra rows above/below viewport
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // ── Resolve entries (props vs static fallback) ──────────────────────────
  // Only use defaults when NEITHER plan has real data (pure demo mode)

  const humanEntries = useMemo<GanttEntry[]>(() => {
    if (!humanPlanData || humanPlanData.length === 0) return [];
    return humanPlanData
      .map((r) => rowToEntry(r, 'human'))
      .filter((entry): entry is GanttEntry => entry !== null);
  }, [humanPlanData]);

  const aiEntries = useMemo<GanttEntry[]>(() => {
    if (!planData || planData.length === 0) return [];
    return planData
      .map((r) => rowToEntry(r, 'ai'))
      .filter((entry): entry is GanttEntry => entry !== null);
  }, [planData]);

  // ── Project color map ──────────────────────────────────────────────────
  const projectColorMap = useMemo(() => buildProjectColorMap([...aiEntries, ...humanEntries]), [aiEntries, humanEntries]);

  // ── All unique resources (for filter dropdown) ─────────────────────────
  const allResourceNames = useMemo(() => {
    const allEntries = [...humanEntries, ...aiEntries];
    const seen = new Set<string>();
    const result: string[] = [];
    allEntries.forEach((e) => {
      if (e.resource && e.resource !== 'Unknown' && !seen.has(e.resource)) {
        seen.add(e.resource);
        result.push(e.resource);
      }
    });
    return result.sort();
  }, [humanEntries, aiEntries]);

  // ── Derive chart geometry from data ────────────────────────────────────
  const { resources, chartStart, chartEnd, dateToX, resourceBaseY, chartW, chartH, svgW, svgH } =
    useMemo(() => {
      const allEntries = [...humanEntries, ...(showAI ? aiEntries : [])];

      // Unique ordered resources — apply filter
      const filterLower = resourceFilter.toLowerCase();
      const seen = new Set<string>();
      const resources: string[] = [];
      allEntries.forEach((e) => {
        if (e.resource && e.resource !== 'Unknown' && !seen.has(e.resource)) {
          if (!filterLower || e.resource.toLowerCase().includes(filterLower)) {
            seen.add(e.resource);
            resources.push(e.resource);
          }
        }
      });
      if (resources.length === 0) resources.push('(no matching yards)');

      // Date extent with padding
      const allMs = allEntries
        .flatMap((e) => [e.start.getTime(), e.end.getTime()])
        .filter((ms) => Number.isFinite(ms));

      const minMs = allMs.length ? Math.min(...allMs) : new Date(2026, 0, 1).getTime();
      const maxMs = allMs.length ? Math.max(...allMs) : new Date(2029, 3, 30).getTime();

      const chartStart = new Date(minMs);
      chartStart.setDate(1);
      chartStart.setMonth(chartStart.getMonth() - 1);
      const chartEnd = new Date(maxMs);
      chartEnd.setMonth(chartEnd.getMonth() + 2);

      const totalDays = Math.ceil((chartEnd.getTime() - chartStart.getTime()) / 86_400_000);
      const chartW = Math.max(totalDays * pxPerDay, 800);
      const chartH = resources.length * ROW_HEIGHT;
      const svgW = M_LEFT + chartW + M_RIGHT;
      const svgH = M_TOP + chartH + M_BOTTOM;

      return {
        resources, chartStart, chartEnd,
        dateToX: makeDateToX(chartStart, pxPerDay),
        resourceBaseY: makeResourceBaseY(resources),
        chartW, chartH, svgW, svgH,
      };
    }, [humanEntries, aiEntries, showAI, pxPerDay, resourceFilter]);

  const monthTicks   = useMemo(() => generateMonthTicks(chartStart, chartEnd), [chartStart, chartEnd]);
  const humanSubRows = useMemo(() => assignSubRows(humanEntries, resources, dateToX), [humanEntries, resources, dateToX]);
  const aiSubRows    = useMemo(() => assignSubRows(aiEntries, resources, dateToX), [aiEntries, resources, dateToX]);

  const hasData = !!(planData?.length || humanPlanData?.length);
  const todayX = dateToX(new Date());

  // ── Virtual scroll: compute visible row range ──────────────────────────
  const firstVisibleRow = Math.max(0, Math.floor((scrollTop - M_TOP) / ROW_HEIGHT) - VISIBLE_BUFFER);
  const lastVisibleRow = Math.min(resources.length - 1, Math.ceil((scrollTop + containerHeight - M_TOP) / ROW_HEIGHT) + VISIBLE_BUFFER);
  const visibleResources = new Set(resources.slice(firstVisibleRow, lastVisibleRow + 1));

  // Filter entries to only those in visible rows
  const visibleHumanEntries = humanEntries.filter((e) => visibleResources.has(e.resource));
  const visibleAiEntries = aiEntries.filter((e) => visibleResources.has(e.resource));

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Measure container height on mount
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Drag handlers (AI plan bars only) ────────────────────────────────────

  // Stable ref for current chart context (avoids stale closure in drag handlers)
  const chartCtxRef = useRef({ chartStart, chartEnd, resources });
  chartCtxRef.current = { chartStart, chartEnd, resources };

  const dragState = useRef<{
    projectId: string;
    resource: string;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  const handleBarDragStart = (entry: GanttEntry, e: React.DragEvent<SVGGElement>) => {
    if (!onBarRowChange && !onBarDateShift) return;
    if (entry.source !== 'ai') { e.preventDefault(); return; }
    dragState.current = {
      projectId: entry.project_id,
      resource: entry.resource,
      startClientX: e.clientX,
      startClientY: e.clientY,
    };
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    const ds = dragState.current;
    if (!ds || !svgRef.current) return;
    dragState.current = null;

    const { resources: ctxResources } = chartCtxRef.current;
    const svgRect = svgRef.current.getBoundingClientRect();
    const deltaClientX = e.clientX - ds.startClientX;
    const deltaClientY = e.clientY - ds.startClientY;
    const absX = Math.abs(deltaClientX);
    const absY = Math.abs(deltaClientY);

    if (absY > absX) {
      // ── Vertical drag: resource row change ──────────────────────────
      if (!onBarRowChange) return;
      const localY = e.clientY - svgRect.top;
      const rowIdx = Math.floor((localY - M_TOP) / ROW_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(rowIdx, ctxResources.length - 1));
      const newResource = ctxResources[clampedIdx];
      if (!newResource || newResource === ds.resource) return;
      if (!ctxResources.includes(newResource)) {
        onDragError?.(`Invalid resource: ${newResource}`);
        return;
      }
      onBarRowChange(ds.projectId, newResource).catch(() => {
        onDragError?.('Failed to update resource');
      });
    } else {
      // ── Horizontal drag: date shift ──────────────────────────────────
      if (!onBarDateShift) return;
      const deltaDays = Math.round(deltaClientX / pxPerDay);
      if (deltaDays === 0) return;
      onBarDateShift(ds.projectId, deltaDays).catch(() => {
        onDragError?.('Date shift failed');
      });
    }
  };

  if (!hasData) {
    return (
      <div className="gantt-wrapper" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        <p>No plan data to display. Upload a CSV or generate a plan.</p>
      </div>
    );
  }

  return (
    <div className="gantt-wrapper">
      {/* Header */}
      <div className="gantt-header">
        <div>
          <p className="gantt-subtitle">
            {resources.length} yards &nbsp;·&nbsp; {aiEntries.length + humanEntries.length} tasks
          </p>
        </div>
        <div className="gantt-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showAI}
              onChange={(e) => setShowAI(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            Show AI capacity plan
          </label>
        </div>
      </div>

      {/* Zoom + Filter toolbar */}
      <div className="gantt-toolbar">
        <div className="gantt-zoom">
          <span className="toolbar-label">Zoom:</span>
          {ZOOM_LEVELS.map((z, i) => (
            <button
              key={z.label}
              className={`zoom-btn ${i === zoomIdx ? 'zoom-btn--active' : ''}`}
              onClick={() => setZoomIdx(i)}
            >
              {z.label}
            </button>
          ))}
        </div>
        <div className="gantt-filter">
          <span className="toolbar-label">Filter yards:</span>
          <input
            type="text"
            className="filter-input"
            placeholder="e.g. Pioneer, Tuas..."
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          />
          {resourceFilter && (
            <button className="filter-clear" onClick={() => setResourceFilter('')}>✕</button>
          )}
          <span className="filter-count">{resources.length} of {allResourceNames.length} yards</span>
        </div>
      </div>

      {/* Legend — project color-coded */}
      <div className="gantt-legend">
        {humanEntries.length > 0 && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: HUMAN_COLOR }} />
            Human plan
          </span>
        )}
        {Array.from(projectColorMap.entries()).map(([projId, cIdx]) => (
          <span className="legend-item" key={projId}>
            <span className="legend-swatch" style={{ background: PROJECT_COLORS[cIdx] }} />
            {projId}
          </span>
        ))}
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'rgba(255,255,100,0.75)', width: 3 }} />
          Today
        </span>
      </div>

      {/* Chart with frozen Y-axis */}
      <div className="gantt-chart-container">
        {/* Frozen Y-axis sidebar */}
        <div className="gantt-axis-sidebar" style={{ height: containerHeight || 600, overflow: 'hidden' }}>
          <div className="gantt-axis-header">Resources</div>
          <div style={{ height: chartH, position: 'relative', transform: `translateY(-${scrollTop - M_TOP}px)` }}>
            {resources.map((res, i) => (
              <div
                key={res}
                className="gantt-axis-label"
                title={res}
                style={{
                  position: 'absolute',
                  top: i * ROW_HEIGHT,
                  height: ROW_HEIGHT,
                  display: visibleResources.has(res) ? undefined : 'none',
                }}
              >
                {res}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable chart */}
        <div className="gantt-scroll" ref={scrollContainerRef} onScroll={handleScroll}>
          <svg
            ref={svgRef}
            width={svgW} height={svgH}
            className="gantt-svg"
            style={{ display: 'block' }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >

          {/* Background */}
          <rect x={0} y={0} width={svgW} height={svgH} fill="var(--gantt-bg,#0f1117)" />

          {/* Alternating row bands — only visible rows */}
          {resources.map((res, i) => {
            if (!visibleResources.has(res)) return null;
            return (
              <rect key={i} x={M_LEFT} y={M_TOP + i * ROW_HEIGHT}
                width={chartW} height={ROW_HEIGHT}
                fill={i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)'}
              />
            );
          })}

          {/* Vertical month gridlines */}
          {monthTicks.map((tick, i) => {
            const x = dateToX(tick.date);
            return (
              <line key={i} x1={x} y1={M_TOP} x2={x} y2={M_TOP + chartH}
                stroke={tick.isQuarter ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'}
                strokeWidth={tick.isQuarter ? 1 : 0.5}
                strokeDasharray={tick.isQuarter ? '0' : '3,3'}
              />
            );
          })}

          {/* Horizontal row dividers */}
          {[...Array(resources.length + 1)].map((_, i) => (
            <line key={i}
              x1={M_LEFT - 6} y1={M_TOP + i * ROW_HEIGHT}
              x2={M_LEFT + chartW} y2={M_TOP + i * ROW_HEIGHT}
              stroke="rgba(255,255,255,0.08)" strokeWidth={1}
            />
          ))}

          {/* Month labels (X-axis) */}
          {monthTicks.map((tick, i) => {
            if (!tick.isQuarter && i % 2 !== 0) return null;
            const x = dateToX(tick.date);
            return (
              <text key={i} x={x + 4} y={M_TOP - 10}
                fontSize={tick.isQuarter ? 11 : 9}
                fontWeight={tick.isQuarter ? '700' : '400'}
                fill={tick.isQuarter ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)'}
                fontFamily="var(--font-mono,monospace)"
              >
                {tick.label}
              </text>
            );
          })}

          {/* X-axis label */}
          <text x={M_LEFT + chartW / 2} y={svgH - 5}
            textAnchor="middle" fontSize={10}
            fill="rgba(255,255,255,0.28)" fontFamily="var(--font-sans,sans-serif)"
          >
            Timeline
          </text>

          {/* Today marker */}
          <line x1={todayX} y1={M_TOP - 8} x2={todayX} y2={M_TOP + chartH}
            stroke="rgba(255,255,100,0.65)" strokeWidth={1.5} strokeDasharray="4,3"
          />
          <text x={todayX + 4} y={M_TOP - 11}
            fontSize={9} fontWeight="700"
            fill="rgba(255,255,100,0.8)" fontFamily="var(--font-mono,monospace)"
          >
            Today
          </text>

          {/* Human plan bars (not draggable) — only visible rows rendered */}
          {visibleHumanEntries.map((entry) => {
            const origIdx = humanEntries.indexOf(entry);
            return (
              <Bar key={`h-${origIdx}`}
                entry={entry} subRow={humanSubRows.get(origIdx) ?? 0}
                yOffset={0}
                colorOverride={HUMAN_COLOR}
                onHover={setTooltip}
                dateToX={dateToX} resourceBaseY={resourceBaseY}
              />
            );
          })}

          {/* AI plan bars — only visible rows rendered */}
          {showAI && visibleAiEntries.map((entry) => {
            const origIdx = aiEntries.indexOf(entry);
            const cIdx = projectColorMap.get(entry.project_id) ?? 0;
            return (
              <Bar key={`a-${origIdx}`}
                entry={{ ...entry, _strokeOverride: PROJECT_STROKES[cIdx] }}
                subRow={aiSubRows.get(origIdx) ?? 0}
                yOffset={humanEntries.length > 0 ? AI_Y_OFFSET : 0}
                colorOverride={PROJECT_COLORS[cIdx]}
                onHover={setTooltip}
                dateToX={dateToX} resourceBaseY={resourceBaseY}
                onBarDragStart={handleBarDragStart}
              />
            );
          })}
        </svg>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="gantt-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div className="tt-project">
            {tooltip.entry.project_id} — {tooltip.entry.project_name}
          </div>
          <div className="tt-row">
            <span className="tt-label">Resource</span>
            <span className="tt-value">{tooltip.entry.resource}</span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Start</span>
            <span className="tt-value">{fmt(tooltip.entry.start)}</span>
          </div>
          <div className="tt-row">
            <span className="tt-label">End</span>
            <span className="tt-value">{fmt(tooltip.entry.end)}</span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Priority</span>
            <span className={`tt-priority tt-${tooltip.entry.priority.toLowerCase()}`}>
              {tooltip.entry.priority}
            </span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Source</span>
            <span className={`tt-priority ${tooltip.entry.source === 'ai' ? 'tt-ai' : 'tt-human'}`}>
              {tooltip.entry.source === 'ai' ? 'AI Plan' : 'Human Plan'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;

