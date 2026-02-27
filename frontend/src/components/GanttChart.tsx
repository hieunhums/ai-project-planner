import React, { useMemo, useState } from 'react';
import './GanttChart.css';

interface GanttEntry {
  project_id: string;
  project_name: string;
  resource: string;
  start: Date;
  end: Date;
  priority: string;
  source: 'human' | 'ai';
}

// Parse dd-MM-yyyy
const parseDate = (d: string): Date => {
  const [day, month, year] = d.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// ── Static data ───────────────────────────────────────────────────────────────

const RAW_HUMAN: Omit<GanttEntry, 'start' | 'end' | 'source'>[] = [
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
  ['01-02-2026', '31-08-2026'],
  ['01-09-2026', '31-12-2026'],
  ['01-01-2027', '30-06-2027'],
  ['01-01-2027', '31-08-2027'],
  ['01-10-2026', '28-02-2027'],
  ['01-06-2027', '31-08-2027'],
  ['01-09-2027', '31-10-2027'],
  ['01-10-2026', '28-02-2027'],
  ['01-05-2027', '30-04-2028'],
  ['01-05-2027', '31-07-2027'],
  ['01-01-2027', '30-04-2027'],
  ['01-04-2028', '31-12-2028'],
  ['01-03-2026', '31-05-2026'],
  ['01-01-2028', '30-11-2028'],
  ['01-12-2028', '31-03-2029'],
  ['01-10-2028', '31-12-2028'],
];

const RAW_AI_EXTRA: Omit<GanttEntry, 'start' | 'end' | 'source'>[] = [
  { project_id: 'PRJ-F23', project_name: 'S1', resource: 'JY-QE', priority: 'High' },
  { project_id: 'PRJ-F23', project_name: 'S2', resource: 'JY-QC', priority: 'High' },
];
const RAW_DATES_AI_EXTRA: string[][] = [
  ['01-03-2027', '30-04-2027'],
  ['01-05-2027', '01-10-2027'],
];

const buildEntries = (
  raw: Omit<GanttEntry, 'start' | 'end' | 'source'>[],
  dates: string[][],
  source: 'human' | 'ai',
): GanttEntry[] =>
  raw.map((r, i) => ({
    ...r,
    start: parseDate(dates[i][0]),
    end: parseDate(dates[i][1]),
    source,
  }));

const HUMAN_ENTRIES: GanttEntry[] = buildEntries(RAW_HUMAN, RAW_DATES_HUMAN, 'human');
const AI_EXTRA_ENTRIES: GanttEntry[] = buildEntries(RAW_AI_EXTRA, RAW_DATES_AI_EXTRA, 'ai');
const ALL_AI_ENTRIES: GanttEntry[] = [
  ...buildEntries(RAW_HUMAN, RAW_DATES_HUMAN, 'ai'),
  ...AI_EXTRA_ENTRIES,
];

// ── Layout constants (horizontal Gantt: time → X, resources → Y) ─────────────

const RESOURCES = ['JY-QA', 'JY-QB', 'JY-QC', 'JY-QD', 'JY-QE', 'JY-QF', 'JY-QG'];

const CHART_START = new Date(2026, 0, 1);   // 1 Jan 2026
const CHART_END   = new Date(2029, 3, 30);  // 30 Apr 2029

const TOTAL_DAYS = Math.ceil(
  (CHART_END.getTime() - CHART_START.getTime()) / 86_400_000,
);

const PX_PER_DAY = 1.6; // horizontal pixels per calendar day

// Resource row geometry
const ROW_HEIGHT  = 60; // total height of one resource lane
const BAR_HEIGHT  = 22; // height of a single bar
const BAR_GAP     =  4; // vertical gap between stacked bars
const ROW_PAD_TOP =  8; // top padding within a lane before first bar

// SVG margins
const M_LEFT   = 76;  // space for resource labels on the left
const M_TOP    = 54;  // space for month header at top
const M_RIGHT  = 20;
const M_BOTTOM = 24;

const CHART_W = TOTAL_DAYS * PX_PER_DAY;
const CHART_H = RESOURCES.length * ROW_HEIGHT;
const SVG_W   = M_LEFT + CHART_W + M_RIGHT;
const SVG_H   = M_TOP  + CHART_H + M_BOTTOM;

const HUMAN_COLOR    = '#3a86ff';
const AI_EXTRA_COLOR = '#ff9f1c';

// ── Coordinate helpers ────────────────────────────────────────────────────────

const dateToX = (d: Date): number =>
  M_LEFT + ((d.getTime() - CHART_START.getTime()) / 86_400_000) * PX_PER_DAY;

const resourceBaseY = (res: string): number =>
  M_TOP + RESOURCES.indexOf(res) * ROW_HEIGHT;

const fmt = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Sub-row packing (greedy, per resource lane) ───────────────────────────────
// Prevents horizontal bar overlap within the same resource row.

function assignSubRows(entries: GanttEntry[]): Map<number, number> {
  const laneEnd: Map<string, number[]> = new Map();
  RESOURCES.forEach((r) => laneEnd.set(r, []));

  const result = new Map<number, number>();
  entries.forEach((e, i) => {
    const startX = dateToX(e.start);
    const endX   = dateToX(e.end);
    const slots  = laneEnd.get(e.resource)!;
    let slot = slots.findIndex((ex) => ex < startX - 2);
    if (slot === -1) { slot = slots.length; slots.push(endX); }
    else { slots[slot] = endX; }
    result.set(i, slot);
  });
  return result;
}

// ── Month ticks ───────────────────────────────────────────────────────────────

function generateMonthTicks() {
  const ticks: { date: Date; label: string; isQuarter: boolean }[] = [];
  const cur = new Date(CHART_START);
  while (cur <= CHART_END) {
    const isQuarter = cur.getMonth() % 3 === 0;
    const label = isQuarter
      ? cur.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
      : cur.toLocaleString('en-GB', { month: 'short' });
    ticks.push({ date: new Date(cur), label, isQuarter });
    cur.setMonth(cur.getMonth() + 1);
  }
  return ticks;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipInfo { x: number; y: number; entry: GanttEntry; }

// ── Bar ───────────────────────────────────────────────────────────────────────

interface BarProps {
  entry: GanttEntry;
  subRow: number;
  isAiExtra: boolean;
  onHover: (info: TooltipInfo | null) => void;
}

const Bar: React.FC<BarProps> = ({ entry, subRow, isAiExtra, onHover }) => {
  const x      = dateToX(entry.start);
  const width  = Math.max(dateToX(entry.end) - x, 4);
  const baseY  = resourceBaseY(entry.resource);
  const y      = baseY + ROW_PAD_TOP + subRow * (BAR_HEIGHT + BAR_GAP);
  const fill   = isAiExtra ? AI_EXTRA_COLOR : HUMAN_COLOR;
  const opacity = isAiExtra ? 0.9 : 0.78;

  return (
    <g
      className="gantt-bar-group"
      onMouseEnter={(e) => onHover({ x: e.clientX, y: e.clientY, entry })}
      onMouseLeave={() => onHover(null)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={BAR_HEIGHT}
        rx={5}
        fill={fill}
        opacity={opacity}
        stroke={isAiExtra ? '#c97000' : '#1a56c4'}
        strokeWidth={1}
        className="gantt-bar"
      />
      {width > 40 && (
        <text
          x={x + Math.min(width / 2, 58)}
          y={y + BAR_HEIGHT / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fontWeight="700"
          fill="white"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {entry.project_id}{width > 100 ? ` ${entry.project_name}` : ''}
        </text>
      )}
    </g>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const GanttChart: React.FC = () => {
  const [showAI, setShowAI] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const monthTicks   = useMemo(generateMonthTicks, []);
  const humanSubRows = useMemo(() => assignSubRows(HUMAN_ENTRIES), []);
  const aiSubRows    = useMemo(() => assignSubRows(ALL_AI_ENTRIES), []);

  const todayX = dateToX(new Date(2026, 1, 20)); // 20 Feb 2026

  return (
    <div className="gantt-wrapper">
      {/* Header */}
      <div className="gantt-header">
        <div>
          <h2 className="gantt-title">AI Generated Project Plan</h2>
          <p className="gantt-subtitle">
            Resource allocation timeline &nbsp;·&nbsp; {RESOURCES.length} yards
            &nbsp;·&nbsp; {HUMAN_ENTRIES.length} human entries
            &nbsp;·&nbsp; {AI_EXTRA_ENTRIES.length} AI suggestions
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
            Show AI augmented plan
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
            <span className="legend-swatch" style={{ background: AI_EXTRA_COLOR }} />
            AI suggested additions (PRJ-F23)
          </span>
        )}
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'rgba(255,255,100,0.75)', width: 3 }} />
          Today
        </span>
      </div>

      {/* Chart */}
      <div className="gantt-scroll">
        <svg width={SVG_W} height={SVG_H} className="gantt-svg" style={{ display: 'block' }}>

          {/* Background */}
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="var(--gantt-bg,#0f1117)" />

          {/* ── Alternating row bands ──────────────────────────────────── */}
          {RESOURCES.map((_, i) => (
            <rect
              key={i}
              x={M_LEFT}
              y={M_TOP + i * ROW_HEIGHT}
              width={CHART_W}
              height={ROW_HEIGHT}
              fill={i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)'}
            />
          ))}

          {/* ── Vertical month gridlines ───────────────────────────────── */}
          {monthTicks.map((tick, i) => {
            const x = dateToX(tick.date);
            return (
              <line
                key={i}
                x1={x} y1={M_TOP}
                x2={x} y2={M_TOP + CHART_H}
                stroke={tick.isQuarter ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'}
                strokeWidth={tick.isQuarter ? 1 : 0.5}
                strokeDasharray={tick.isQuarter ? '0' : '3,3'}
              />
            );
          })}

          {/* ── Horizontal row dividers ────────────────────────────────── */}
          {[...Array(RESOURCES.length + 1)].map((_, i) => (
            <line
              key={i}
              x1={M_LEFT - 6} y1={M_TOP + i * ROW_HEIGHT}
              x2={M_LEFT + CHART_W} y2={M_TOP + i * ROW_HEIGHT}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          ))}

          {/* ── Resource labels (Y-axis) ───────────────────────────────── */}
          {RESOURCES.map((res, i) => (
            <text
              key={res}
              x={M_LEFT - 10}
              y={M_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight="700"
              fill="rgba(255,255,255,0.78)"
              fontFamily="var(--font-sans,sans-serif)"
            >
              {res}
            </text>
          ))}

          {/* ── Month labels (X-axis) ──────────────────────────────────── */}
          {monthTicks.map((tick, i) => {
            // Show all quarter labels, every-other non-quarter
            if (!tick.isQuarter && i % 2 !== 0) return null;
            const x = dateToX(tick.date);
            return (
              <text
                key={i}
                x={x + 4}
                y={M_TOP - 10}
                fontSize={tick.isQuarter ? 11 : 9}
                fontWeight={tick.isQuarter ? '700' : '400'}
                fill={tick.isQuarter ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)'}
                fontFamily="var(--font-mono,monospace)"
              >
                {tick.label}
              </text>
            );
          })}

          {/* ── X-axis bottom label ────────────────────────────────────── */}
          <text
            x={M_LEFT + CHART_W / 2}
            y={SVG_H - 5}
            textAnchor="middle"
            fontSize={10}
            fill="rgba(255,255,255,0.28)"
            fontFamily="var(--font-sans,sans-serif)"
          >
            Timeline
          </text>

          {/* ── Today marker ──────────────────────────────────────────── */}
          <line
            x1={todayX} y1={M_TOP - 8}
            x2={todayX} y2={M_TOP + CHART_H}
            stroke="rgba(255,255,100,0.65)"
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
          <text
            x={todayX + 4} y={M_TOP - 11}
            fontSize={9} fontWeight="700"
            fill="rgba(255,255,100,0.8)"
            fontFamily="var(--font-mono,monospace)"
          >
            Today
          </text>

          {/* ── Human plan bars ───────────────────────────────────────── */}
          {HUMAN_ENTRIES.map((entry, idx) => (
            <Bar
              key={`h-${idx}`}
              entry={entry}
              subRow={humanSubRows.get(idx) ?? 0}
              isAiExtra={false}
              onHover={setTooltip}
            />
          ))}

          {/* ── AI extra bars (PRJ-F23 only) ──────────────────────────── */}
          {showAI &&
            ALL_AI_ENTRIES.map((entry, idx) => {
              if (entry.project_id !== 'PRJ-F23') return null;
              return (
                <Bar
                  key={`a-${idx}`}
                  entry={entry}
                  subRow={aiSubRows.get(idx) ?? 0}
                  isAiExtra={true}
                  onHover={setTooltip}
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
          {tooltip.entry.project_id === 'PRJ-F23' && (
            <div className="tt-ai-badge">✦ AI Suggested</div>
          )}
        </div>
      )}
    </div>
  );
};

export default GanttChart;

