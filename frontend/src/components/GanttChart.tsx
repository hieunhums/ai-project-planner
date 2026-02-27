import React, { useMemo, useRef, useState } from 'react';
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

const parseFlexDate = (d: string): Date => {
  if (!d) return new Date();
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  const [day, month, year] = d.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// ── Row converter ─────────────────────────────────────────────────────────────

const rowToEntry = (row: CapacityPlanRow, source: 'human' | 'ai'): GanttEntry => ({
  project_id:   row.project_id   ?? '',
  project_name: row.project_name ?? '',
  resource:     row.resource     ?? 'Unknown',
  start:        parseFlexDate(row.start_date ?? ''),
  end:          parseFlexDate(row.end_date   ?? ''),
  priority:     row.priority     ?? 'Med',
  source,
});

// ── Static fallback data ────────────────────────────────────────────────────

const RAW_HUMAN_META: Omit<GanttEntry, 'start' | 'end' | 'source'>[] = [
  { project_id: 'PRJ-F01', project_name: 'Main',      resource: 'JY-QA', priority: 'High' },
  { project_id: 'PRJ-F01', project_name: 'Extension', resource: 'JY-QA', priority: 'High' },
  { project_id: 'PRJ-F03', project_name: 'Main',      resource: 'JY-QB', priority: 'High' },
  { project_id: 'PRJ-F04', project_name: 'Main',      resource: 'JY-QA', priority: 'Med'  },
  { project_id: 'PRJ-F05', project_name: 'Main',      resource: 'JY-QC', priority: 'Med'  },
  { project_id: 'PRJ-F07', project_name: 'S1',        resource: 'JY-QD', priority: 'High' },
  { project_id: 'PRJ-F07', project_name: 'S2',        resource: 'JY-QD', priority: 'Med'  },
  { project_id: 'PRJ-F08', project_name: 'Main',      resource: 'JY-QE', priority: 'High' },
  { project_id: 'PRJ-F10', project_name: 'Main',      resource: 'JY-QE', priority: 'High' },
  { project_id: 'PRJ-F12', project_name: 'S1',        resource: 'JY-QF', priority: 'Med'  },
  { project_id: 'PRJ-F13', project_name: 'Main',      resource: 'JY-QG', priority: 'Med'  },
  { project_id: 'PRJ-F15', project_name: 'Main',      resource: 'JY-QE', priority: 'Med'  },
  { project_id: 'PRJ-F19', project_name: 'Main',      resource: 'JY-QE', priority: 'Med'  },
  { project_id: 'PRJ-F21', project_name: 'Main',      resource: 'JY-QA', priority: 'High' },
  { project_id: 'PRJ-F21', project_name: 'Extension', resource: 'JY-QA', priority: 'High' },
  { project_id: 'PRJ-F22', project_name: 'Main',      resource: 'JY-QC', priority: 'High' },
];

const RAW_DATES_HUMAN: string[][] = [
  ['01-02-2026', '31-08-2026'], ['01-09-2026', '31-12-2026'],
  ['01-01-2027', '30-06-2027'], ['01-01-2027', '31-08-2027'],
  ['01-10-2026', '28-02-2027'], ['01-06-2027', '31-08-2027'],
  ['01-09-2027', '31-10-2027'], ['01-10-2026', '28-02-2027'],
  ['01-05-2027', '30-04-2028'], ['01-05-2027', '31-07-2027'],
  ['01-01-2027', '30-04-2027'], ['01-04-2028', '31-12-2028'],
  ['01-03-2026', '31-05-2026'], ['01-01-2028', '30-11-2028'],
  ['01-12-2028', '31-03-2029'], ['01-10-2028', '31-12-2028'],
];

const DEFAULT_HUMAN_ENTRIES: GanttEntry[] = RAW_HUMAN_META.map((r, i) => ({
  ...r,
  start:  parseFlexDate(RAW_DATES_HUMAN[i][0]),
  end:    parseFlexDate(RAW_DATES_HUMAN[i][1]),
  source: 'human' as const,
}));

const DEFAULT_AI_ENTRIES: GanttEntry[] = [
  ...DEFAULT_HUMAN_ENTRIES.map((e) => ({ ...e, source: 'ai' as const })),
  {
    project_id: 'PRJ-F23', project_name: 'S1', resource: 'JY-QE', priority: 'High',
    start: parseFlexDate('01-03-2027'), end: parseFlexDate('30-04-2027'), source: 'ai' as const,
  },
  {
    project_id: 'PRJ-F23', project_name: 'S2', resource: 'JY-QC', priority: 'High',
    start: parseFlexDate('01-05-2027'), end: parseFlexDate('01-10-2027'), source: 'ai' as const,
  },
];

// ── Layout constants ──────────────────────────────────────────────────────────

const PX_PER_DAY  = 1.6;

const ROW_HEIGHT  = 64;
const BAR_HEIGHT  = 18;
const BAR_GAP     =  3;
const ROW_PAD_TOP =  6;

/** Vertical offset for AI bars so they sit below human bars in the same row */
const AI_Y_OFFSET = BAR_HEIGHT + 4;
const M_LEFT      = 90;
const M_TOP       = 54;
const M_RIGHT     = 20;
const M_BOTTOM    = 24;

const HUMAN_COLOR = '#3a86ff';
const AI_COLOR    = '#ff9f1c';

const fmt = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Geometry factories (accept runtime values) ────────────────────────────────

function makeDateToX(chartStart: Date): (d: Date) => number {
  return (d) => M_LEFT + ((d.getTime() - chartStart.getTime()) / 86_400_000) * PX_PER_DAY;
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
  const width  = Math.max(dateToX(entry.end) - x, 4);
  const baseY  = resourceBaseY(entry.resource);
  const y      = baseY + ROW_PAD_TOP + subRow * (BAR_HEIGHT + BAR_GAP) + yOffset;
  const fill   = colorOverride ?? (entry.source === 'human' ? HUMAN_COLOR : AI_COLOR);
  const stroke = entry.source === 'ai' ? '#c97000' : '#1a56c4';
  const opacity = entry.source === 'human' ? 0.78 : 0.9;

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
          x={x + Math.min(width / 2, 58)} y={y + BAR_HEIGHT / 2 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fontWeight="700" fill="white"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {entry.project_id}{width > 100 ? ` ${entry.project_name}` : ''}
        </text>
      )}
    </g>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

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

  // ── Resolve entries (props vs static fallback) ──────────────────────────
  const humanEntries = useMemo<GanttEntry[]>(() => {
    if (humanPlanData && humanPlanData.length > 0) {
      return humanPlanData.map((r) => rowToEntry(r, 'human'));
    }
    return DEFAULT_HUMAN_ENTRIES;
  }, [humanPlanData]);

  const aiEntries = useMemo<GanttEntry[]>(() => {
    if (planData && planData.length > 0) {
      return planData.map((r) => rowToEntry(r, 'ai'));
    }
    return DEFAULT_AI_ENTRIES;
  }, [planData]);

  // ── Derive chart geometry from data ────────────────────────────────────
  const { resources, chartStart, chartEnd, dateToX, resourceBaseY, chartW, chartH, svgW, svgH } =
    useMemo(() => {
      const allEntries = [...humanEntries, ...(showAI ? aiEntries : [])];

      // Unique ordered resources
      const seen = new Set<string>();
      const resources: string[] = [];
      allEntries.forEach((e) => {
        if (e.resource && e.resource !== 'Unknown' && !seen.has(e.resource)) {
          seen.add(e.resource);
          resources.push(e.resource);
        }
      });
      if (resources.length === 0) resources.push('JY-QA');

      // Date extent with padding
      const allMs = allEntries.flatMap((e) => [e.start.getTime(), e.end.getTime()]);
      const minMs = allMs.length ? Math.min(...allMs) : new Date(2026, 0, 1).getTime();
      const maxMs = allMs.length ? Math.max(...allMs) : new Date(2029, 3, 30).getTime();
      const chartStart = new Date(minMs);
      chartStart.setDate(1);
      chartStart.setMonth(chartStart.getMonth() - 1);
      const chartEnd = new Date(maxMs);
      chartEnd.setMonth(chartEnd.getMonth() + 2);

      const totalDays = Math.ceil((chartEnd.getTime() - chartStart.getTime()) / 86_400_000);
      const chartW = totalDays * PX_PER_DAY;
      const chartH = resources.length * ROW_HEIGHT;
      const svgW = M_LEFT + chartW + M_RIGHT;
      const svgH = M_TOP + chartH + M_BOTTOM;

      return {
        resources, chartStart, chartEnd,
        dateToX: makeDateToX(chartStart),
        resourceBaseY: makeResourceBaseY(resources),
        chartW, chartH, svgW, svgH,
      };
    }, [humanEntries, aiEntries, showAI]);

  const monthTicks   = useMemo(() => generateMonthTicks(chartStart, chartEnd), [chartStart, chartEnd]);
  const humanSubRows = useMemo(() => assignSubRows(humanEntries, resources, dateToX), [humanEntries, resources, dateToX]);
  const aiSubRows    = useMemo(() => assignSubRows(aiEntries, resources, dateToX), [aiEntries, resources, dateToX]);

  const isUsingProps = !!(planData?.length || humanPlanData?.length);
  const todayX = dateToX(new Date());

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
      const deltaDays = Math.round(deltaClientX / PX_PER_DAY);
      if (deltaDays === 0) return;
      onBarDateShift(ds.projectId, deltaDays).catch(() => {
        onDragError?.('Date shift failed');
      });
    }
  };

  return (
    <div className="gantt-wrapper">
      {/* Header */}
      <div className="gantt-header">
        <div>
          <h2 className="gantt-title">AI Generated Project Plan</h2>
          <p className="gantt-subtitle">
            Resource allocation timeline &nbsp;·&nbsp; {resources.length} yards
            &nbsp;·&nbsp; {humanEntries.length} human entries
            &nbsp;·&nbsp;{' '}
            {isUsingProps
              ? `${aiEntries.length} AI plan rows`
              : `${aiEntries.filter((e) => e.project_id === 'PRJ-F23').length} AI suggestions`}
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
            Show AI{isUsingProps ? ' capacity plan' : ' augmented plan'}
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="gantt-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: HUMAN_COLOR }} />
          Human generated plan
        </span>
        {showAI && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: AI_COLOR }} />
            {isUsingProps ? 'AI capacity plan' : 'AI suggested additions'}
          </span>
        )}
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'rgba(255,255,100,0.75)', width: 3 }} />
          Today
        </span>
      </div>

      {/* Chart */}
      <div className="gantt-scroll">
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

          {/* Alternating row bands */}
          {resources.map((_, i) => (
            <rect key={i} x={M_LEFT} y={M_TOP + i * ROW_HEIGHT}
              width={chartW} height={ROW_HEIGHT}
              fill={i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)'}
            />
          ))}

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

          {/* Resource labels (Y-axis) */}
          {resources.map((res, i) => (
            <text key={res}
              x={M_LEFT - 10} y={M_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2}
              textAnchor="end" dominantBaseline="middle"
              fontSize={12} fontWeight="700"
              fill="rgba(255,255,255,0.78)"
              fontFamily="var(--font-sans,sans-serif)"
            >
              {res}
            </text>
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

          {/* Human plan bars (not draggable) — rendered in the top sub-lane */}
          {humanEntries.map((entry, idx) => (
            <Bar key={`h-${idx}`}
              entry={entry} subRow={humanSubRows.get(idx) ?? 0}
              yOffset={0}
              colorOverride={HUMAN_COLOR}
              onHover={setTooltip}
              dateToX={dateToX} resourceBaseY={resourceBaseY}
            />
          ))}

          {/* AI plan bars — rendered in the bottom sub-lane */}
          {showAI && aiEntries.map((entry, idx) => {
            if (!isUsingProps && entry.project_id !== 'PRJ-F23') return null;
            return (
              <Bar key={`a-${idx}`}
                entry={entry} subRow={aiSubRows.get(idx) ?? 0}
                yOffset={AI_Y_OFFSET}
                colorOverride={AI_COLOR}
                onHover={setTooltip}
                dateToX={dateToX} resourceBaseY={resourceBaseY}
                onBarDragStart={handleBarDragStart}
              />
            );
          })}
        </svg>
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

