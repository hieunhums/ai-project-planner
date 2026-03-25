import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toPng } from 'html-to-image';
import GanttChart from '../components/GanttChart';
import { ChangePanel, type ReplanChanges, type ProjectConfig } from '../components/ChangePanel';
import { AIReasoningPanel, type ReplanReasoning } from '../components/AIReasoningPanel';
import { YardSummaryDashboard } from '../components/YardSummaryDashboard';
import { replanWithAIStream, loadPlanStateFromServer, updateProjectFields, savePlanStateToServer } from '../services/api';
import { buildProjectPath } from '../routes';
import { loadPlanState, loadHumanPlanState, savePlanState } from '../services/session';
import { useGanttEdit } from '../hooks/useGanttEdit';
import { useProjectDetail } from '../hooks/useProjectDetail';
import type { CapacityPlanRow } from '../services/types';
import './PlanWorkspacePage.css';

// ── Derive project summary from plan data ────────────────────────────────
function deriveProjectSummary(plan: CapacityPlanRow[], projectName: string) {
  // Try to find rows matching the project name (first word match)
  const projectKey = projectName.split(' ')[0]; // e.g. "Neptune" from "Neptune FPSO Campaign"
  const projectRows = plan.filter(r =>
    (r.project_id || '').toLowerCase().includes(projectKey.toLowerCase())
  );

  // If no match by name, use the first project_id found
  const allProjectIds = [...new Set(plan.map(r => r.project_id).filter(Boolean))];
  const mainProjectId = projectRows.length > 0
    ? projectRows[0].project_id
    : allProjectIds[0] || '';

  const mainRows = plan.filter(r => r.project_id === mainProjectId);
  const otherRows = plan.filter(r => r.project_id !== mainProjectId);

  // Parse dates
  const parseD = (d: string) => {
    if (!d) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) { const [y,m,day] = d.split('-').map(Number); return new Date(y,m-1,day); }
    if (/^\d{2}-\d{2}-\d{4}/.test(d)) { const [day,m,y] = d.split('-').map(Number); return new Date(y,m-1,day); }
    return null;
  };

  const dates = mainRows.flatMap(r => [parseD(r.start_date), parseD(r.end_date)]).filter(Boolean) as Date[];
  const start = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
  const end = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

  const yards = [...new Set(mainRows.map(r => r.resource).filter(Boolean))];
  const phases = mainRows.map(r => ({
    name: r.project_name || '',
    resource: r.resource || '',
    duration: r.duration_days || 0,
    start: r.start_date || '',
    end: r.end_date || '',
    dependency: r.dependencies || '',
  }));

  const totalCost = mainRows.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const priority = mainRows[0]?.priority || '';
  const otherProjectCount = new Set(otherRows.map(r => r.project_id)).size;

  // Derive location from yards
  const yardToLocation: Record<string, string> = {
    'Tuas Boulevard': 'Singapore', 'Admiralty': 'Singapore', 'Benoi': 'Singapore',
    'Pioneer': 'Singapore', 'Tuas': 'Singapore', 'Batam': 'Batam', 'Nantong': 'China',
  };
  const primaryYardGroup = yards.length > 0 ? yards[0].split(' - ')[0] : '';
  const derivedLocation = yardToLocation[primaryYardGroup] || '';

  // Config: use derived values as fallback, project DB fields take priority (applied in component)
  const config: ProjectConfig = {
    hull_length: '',
    hull_width: '',
    hull_height: '',
    topside_weight: '',
    preferred_location: derivedLocation,
    preferred_yard: '', // Don't derive from plan data — use project DB field only
    optimization_goal: 'minimize_duration',
  };

  return {
    mainProjectId,
    phases,
    yards,
    start,
    end,
    totalCost,
    priority,
    mainRows,
    otherRows,
    otherProjectCount,
    allProjectIds,
    config,
  };
}

const fmtDate = (d: Date | null) => d ? d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—';
const fmtCost = (n: number) => n > 0 ? `$${(n / 1_000_000).toFixed(1)}M` : '—';

export const PlanWorkspacePage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const numericProjectId = projectId ? Number(projectId) : null;
  const { project, refresh: refreshProject } = useProjectDetail(numericProjectId);

  const chartRef = useRef<HTMLDivElement>(null);

  // ── Mode: view (clean dashboard) vs replan (sidebar + reasoning) ──
  const [mode, setMode] = useState<'view' | 'replan'>('view');

  // ── Yard overview collapsible ──
  const [yardExpanded, setYardExpanded] = useState(false);

  // Load plans from session first, then try server
  const [sessionPlan, setSessionPlan] = useState<CapacityPlanRow[]>(() => {
    if (!numericProjectId) return [];
    return loadPlanState(numericProjectId)?.plan ?? [];
  });
  const [humanPlanData, setHumanPlanData] = useState<CapacityPlanRow[]>(() => {
    if (!numericProjectId) return [];
    return loadHumanPlanState(numericProjectId) ?? [];
  });
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);

  useEffect(() => {
    if (!numericProjectId || sessionPlan.length > 0) return;
    setIsLoadingFromServer(true);
    loadPlanStateFromServer(numericProjectId)
      .then((serverState) => {
        if (serverState.plan && serverState.plan.length > 0) {
          setSessionPlan(serverState.plan);
          savePlanState(numericProjectId, serverState.plan, serverState.rationale || '');
        }
        if (serverState.human_plan && serverState.human_plan.length > 0) {
          setHumanPlanData(serverState.human_plan);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingFromServer(false));
  }, [numericProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const noPlan = !numericProjectId || (sessionPlan.length === 0 && !isLoadingFromServer);

  // ── Project summary derived from plan data ──
  const summary = useMemo(() => {
    const s = deriveProjectSummary(sessionPlan, project?.name || '');
    // Override config with saved project DB fields
    if (project?.hull_length) s.config.hull_length = String(project.hull_length);
    if (project?.hull_width) s.config.hull_width = String(project.hull_width);
    if (project?.hull_height) s.config.hull_height = String(project.hull_height);
    if (project?.topside_weight) s.config.topside_weight = String(project.topside_weight);
    if (project?.preferred_location) s.config.preferred_location = project.preferred_location;
    if (project?.preferred_yard) s.config.preferred_yard = project.preferred_yard;
    return s;
  }, [sessionPlan, project]);

  // Dashboard vs Gantt drill-down (for yard overview tab)
  const [selectedYard, setSelectedYard] = useState<string | null>(null);
  const [drillLabel, setDrillLabel] = useState<string>('');
  const [drillDateRange, setDrillDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const handleDrillDown = (target: { yardPrefix: string; quarterStart: Date; quarterEnd: Date; label: string }) => {
    setSelectedYard(target.yardPrefix);
    setDrillLabel(target.label);
    setDrillDateRange({ start: target.quarterStart, end: target.quarterEnd });
  };

  const handleBackToDashboard = () => {
    setSelectedYard(null);
    setDrillLabel('');
    setDrillDateRange(null);
  };

  const filteredPlan = useMemo(() => {
    if (!selectedYard) return sessionPlan;
    return sessionPlan.filter((r) => {
      if (!(r.resource || '').startsWith(selectedYard)) return false;
      if (drillDateRange) {
        const parseD = (d: string) => {
          if (!d) return null;
          if (/^\d{4}-\d{2}-\d{2}/.test(d)) { const [y,m,day] = d.split('-').map(Number); return new Date(y,m-1,day); }
          if (/^\d{2}-\d{2}-\d{4}/.test(d)) { const [day,m,y] = d.split('-').map(Number); return new Date(y,m-1,day); }
          return null;
        };
        const s = parseD(r.start_date);
        const e = parseD(r.end_date);
        if (!s || !e) return false;
        return s <= drillDateRange.end && e >= drillDateRange.start;
      }
      return true;
    });
  }, [sessionPlan, selectedYard, drillDateRange]);

  const filteredHumanPlan = useMemo(() => {
    if (!selectedYard) return humanPlanData;
    return humanPlanData.filter((r) => (r.resource || '').startsWith(selectedYard));
  }, [humanPlanData, selectedYard]);

  // Gantt edit hook
  const editHook = useGanttEdit(numericProjectId ?? 0, sessionPlan);
  const [dragError, setDragError] = useState<string | null>(null);

  // AI Reasoning state
  const [reasoning, setReasoning] = useState<ReplanReasoning | null>(null);
  const [isReplanning, setIsReplanning] = useState(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [_selectedBarId] = useState<string | null>(null);
  const [replanError, setReplanError] = useState<string | null>(null);
  const [replanModel, setReplanModel] = useState<string | null>(null);

  // Pending proposal — awaiting user approval
  const [pendingProposal, setPendingProposal] = useState<{ changed_rows: any[]; reasoning: ReplanReasoning } | null>(null);
  const [lastReplanChanges, setLastReplanChanges] = useState<ReplanChanges | null>(null);

  const handleReplan = async (changes: ReplanChanges) => {
    if (!numericProjectId) return;
    setIsReplanning(true);
    setReplanError(null);
    setReasoning(null);
    setPendingProposal(null);
    setStreamingText('');
    setLastReplanChanges(changes);

    try {
      await replanWithAIStream(numericProjectId, editHook.plan, {
        project_name: summary.mainProjectId,
        hull_length: changes.hull_length,
        hull_width: changes.hull_width,
        hull_height: changes.hull_height,
        topside_weight: changes.topside_weight,
        preferred_location: changes.preferred_location,
        preferred_yard: changes.preferred_yard,
        constraints: changes.constraints,
        optimization_goal: changes.optimization_goal,
        free_text: changes.free_text,
      }, {
        onToken: (text) => {
          setStreamingText((prev) => prev + text);
        },
        onDone: (data) => {
          setReplanModel(data.model);
          const result = data.result;
          const r = result.reasoning as ReplanReasoning;
          setReasoning(r);
          setStreamingText('');
          // Store proposal — don't apply yet, wait for user approval
          setPendingProposal({
            changed_rows: result.changed_rows || [],
            reasoning: r,
          });
          setIsReplanning(false);
        },
        onError: (message) => {
          setReplanError(message);
          setStreamingText('');
          setIsReplanning(false);
        },
      });
    } catch (err) {
      setReplanError(err instanceof Error ? err.message : 'Replan failed');
      setReasoning(null);
      setStreamingText('');
      setIsReplanning(false);
    }
  };

  const handleApproveProposal = async () => {
    if (!pendingProposal || !numericProjectId) return;
    const { changed_rows, reasoning: r } = pendingProposal;

    // 1. Apply plan row changes
    if (changed_rows.length > 0) {
      const makeKey = (row: any) => `${row.project_id}::${row.project_name}`;
      const changedMap = new Map<string, any>();
      for (const cr of changed_rows) {
        changedMap.set(makeKey(cr), cr);
      }

      const matched = new Set<string>();
      const newPlan = editHook.plan.map((row) => {
        const key = makeKey(row);
        if (changedMap.has(key)) {
          matched.add(key);
          return { ...row, ...changedMap.get(key) };
        }
        return row;
      });

      for (const [key, cr] of changedMap.entries()) {
        if (!matched.has(key)) {
          newPlan.push(cr);
        }
      }

      savePlanState(numericProjectId, newPlan, r.summary);
      // Persist to server
      await savePlanStateToServer(numericProjectId, newPlan, null, r.summary).catch(() => {});
      // Update ALL state sources so Gantt re-renders immediately
      const freshPlan = [...newPlan];
      setSessionPlan(freshPlan);
      editHook.resetPlan(freshPlan);
    }

    // 2. Persist project context fields (hull, yard, etc.)
    if (lastReplanChanges) {
      const fields: Record<string, any> = {};
      if (lastReplanChanges.hull_length) fields.hull_length = Number(lastReplanChanges.hull_length);
      if (lastReplanChanges.hull_width) fields.hull_width = Number(lastReplanChanges.hull_width);
      if (lastReplanChanges.hull_height) fields.hull_height = Number(lastReplanChanges.hull_height);
      if (lastReplanChanges.topside_weight) fields.topside_weight = Number(lastReplanChanges.topside_weight);
      if (lastReplanChanges.preferred_location) fields.preferred_location = lastReplanChanges.preferred_location;
      if (lastReplanChanges.preferred_yard) fields.preferred_yard = lastReplanChanges.preferred_yard;
      if (Object.keys(fields).length > 0) {
        await updateProjectFields(numericProjectId, fields).catch(() => {});
      }
    }

    setPendingProposal(null);
    // Refresh project detail so ChangePanel picks up new saved values
    refreshProject();
  };

  const handleDiscardProposal = () => {
    setPendingProposal(null);
    setReasoning(null);
    setReplanModel(null);
  };

  // ── Export handlers ──────────────────────────────────────────────────
  const handleDownloadPng = () => {
    if (!chartRef.current) return;
    toPng(chartRef.current, { cacheBust: true })
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.download = `gantt-plan-${numericProjectId}.png`;
        a.href = dataUrl;
        a.click();
      })
      .catch(console.error);
  };

  const handleDownloadCsv = () => {
    const header = 'project_id,project_name,duration_days,start_date,end_date,resource,dependencies,cost,priority';
    const rows = editHook.plan.map((r) =>
      [r.project_id ?? '', (r.project_name ?? '').replace(/,/g, ';'), r.duration_days ?? '', r.start_date ?? '', r.end_date ?? '', r.resource ?? '', (r.dependencies ?? '').replace(/,/g, ';'), r.cost ?? '', r.priority ?? ''].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `capacity-plan-${numericProjectId}.csv`;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (isLoadingFromServer) {
    return (
      <div className="workspace">
        <div className="workspace-empty"><p>Loading plan from server…</p></div>
      </div>
    );
  }

  if (noPlan) {
    return (
      <div className="workspace">
        <div className="workspace-empty">
          <p>No plan loaded for this project.</p>
          {numericProjectId && (
            <button className="btn btn-secondary" onClick={() => navigate(buildProjectPath(numericProjectId))}>
              ← Back to Project
            </button>
          )}
        </div>
      </div>
    );
  }

  const isReplanMode = mode === 'replan';

  return (
    <div className="workspace">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="workspace-topbar">
        {isReplanMode ? (
          <button className="ws-back-btn" onClick={() => setMode('view')}>
            ← Exit Replan
          </button>
        ) : (
          <button className="ws-back-btn" onClick={() => navigate('/projects')}>
            ← Projects
          </button>
        )}

        <h2 className="ws-title">{project?.name || 'Plan Workspace'}</h2>
        {summary.priority && (
          <span className={`badge ${summary.priority === 'Confirmed' ? 'badge-confirmed' : 'badge-enquiry'}`}>
            {summary.priority}
          </span>
        )}

        <div className="ws-actions">
          {isReplanMode && (
            <button className="btn btn-secondary ws-btn" disabled={!editHook.canUndo || editHook.isLoading} onClick={editHook.undo} title="Undo">
              ↩ Undo
            </button>
          )}
          <button className="btn btn-secondary ws-btn" onClick={handleDownloadPng} title="Export PNG">
            ⬇ PNG
          </button>
          <button className="btn btn-secondary ws-btn" onClick={handleDownloadCsv} title="Export CSV">
            ⬇ CSV
          </button>
          {!isReplanMode && (
            <button className="ws-mode-btn ws-mode-btn--enter" onClick={() => setMode('replan')}>
              Replan with AI
            </button>
          )}
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div className={`workspace-body ${isReplanMode ? '' : 'workspace-body--viewmode'}`}>

        {/* Left: Change Panel (replan mode only) */}
        {isReplanMode && (
          <aside className="workspace-sidebar">
            <ChangePanel
              onReplan={handleReplan}
              isLoading={isReplanning}
              planRowCount={editHook.plan.length}
              initialConfig={summary.config}
              onNLSubmit={editHook.applyNLEdit}
              nlLoading={editHook.isLoading}
              nlError={editHook.error}
            />
          </aside>
        )}

        {/* Center */}
        <div className="workspace-center">

          {/* ── Project Summary Card (matches ProjectLandingPage form style) ── */}
          {!isReplanMode && (
            <div className="psc-card">
              <h2>Project Details</h2>
              <div className="psc-grid">
                <div className="psc-field">
                  <label>Vessel</label>
                  <div className="psc-value">{summary.mainProjectId}</div>
                </div>
                <div className="psc-field">
                  <label>Status</label>
                  <div className="psc-value">
                    <span className={`psc-status ${summary.priority === 'Confirmed' ? 'psc-status--confirmed' : 'psc-status--enquiry'}`}>
                      {summary.priority || '—'}
                    </span>
                  </div>
                </div>
                <div className="psc-field">
                  <label>Timeline</label>
                  <div className="psc-value">{fmtDate(summary.start)} → {fmtDate(summary.end)}</div>
                </div>
                <div className="psc-field">
                  <label>Total Cost</label>
                  <div className="psc-value">{fmtCost(summary.totalCost)}</div>
                </div>
              </div>

              <label className="psc-section-label">Phases ({summary.phases.length})</label>
              <div className="psc-phase-timeline">
                {summary.phases.map((p, i) => {
                  const now = new Date();
                  const parseD = (d: string) => {
                    if (!d) return null;
                    if (/^\d{4}-\d{2}-\d{2}/.test(d)) { const [y,m,day] = d.split('-').map(Number); return new Date(y,m-1,day); }
                    if (/^\d{2}-\d{2}-\d{4}/.test(d)) { const [day,m,y] = d.split('-').map(Number); return new Date(y,m-1,day); }
                    return null;
                  };
                  const s = parseD(p.start);
                  const e = parseD(p.end);
                  const isCurrent = s && e && now >= s && now <= e;
                  const isPast = e && now > e;
                  const fmtShort = (d: Date | null) => d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
                  return (
                    <div className={`psc-phase-step ${isCurrent ? 'psc-phase-step--current' : ''} ${isPast ? 'psc-phase-step--past' : ''}`} key={i}>
                      <div className="psc-phase-indicator">
                        <span className="psc-phase-dot">{i + 1}</span>
                        {i < summary.phases.length - 1 && <span className="psc-phase-line" />}
                      </div>
                      <div className="psc-phase-content">
                        <span className="psc-phase-name">{p.name}</span>
                        <span className="psc-phase-dates">{fmtShort(s)} — {fmtShort(e)}</span>
                        <span className="psc-phase-meta">{p.resource.split(' - ').pop()} · {p.duration} days</span>
                        {isCurrent && <span className="psc-phase-badge">Current</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {summary.otherProjectCount > 0 && (
                <p className="psc-context">
                  + {summary.otherProjectCount} other vessel{summary.otherProjectCount > 1 ? 's' : ''} in yard schedule
                </p>
              )}
            </div>
          )}

          {/* ── Project Gantt ─────────────────────────────────── */}
          <div className="workspace-gantt" ref={chartRef}>
            <GanttChart
              key={`gantt-project-${summary.mainProjectId}-${summary.mainRows.length}`}
              planData={summary.mainRows}
              humanPlanData={[]}
              onBarRowChange={editHook.applyRowEdit}
              onBarDateShift={editHook.applyDateShift}
              onDragError={setDragError}
            />
          </div>

          {/* ── Yard Capacity (collapsible) ────────────────────── */}
          {!isReplanMode && (
            <div className="ws-yard-section">
              <button className="ws-yard-toggle" onClick={() => { setYardExpanded(!yardExpanded); handleBackToDashboard(); }}>
                <span className={`ws-yard-chevron ${yardExpanded ? 'ws-yard-chevron--open' : ''}`}>&#9654;</span>
                <span className="ws-yard-toggle-title">Yard Capacity Overview</span>
                <span className="ws-yard-toggle-meta">
                  {new Set((editHook.plan.length > 0 ? editHook.plan : sessionPlan).map(r => (r.resource || '').split(' - ')[0]).filter(Boolean)).size} yards · {(editHook.plan.length > 0 ? editHook.plan : sessionPlan).length} tasks
                </span>
              </button>
              {yardExpanded && (
                <div className="ws-yard-content">
                  {!selectedYard ? (
                    <YardSummaryDashboard
                      planData={editHook.plan.length > 0 ? editHook.plan : sessionPlan}
                      onDrillDown={handleDrillDown}
                      onSelectYard={(yard) => { setSelectedYard(yard); setDrillLabel(yard); setDrillDateRange(null); }}
                      selectedYard={selectedYard}
                    />
                  ) : (
                    <div>
                      <div className="gantt-breadcrumb">
                        <button className="gantt-breadcrumb-back" onClick={handleBackToDashboard}>← All Yards</button>
                        <span className="gantt-breadcrumb-current">{drillLabel || selectedYard}</span>
                        <span className="gantt-breadcrumb-count">{filteredPlan.length} tasks</span>
                      </div>
                      <GanttChart
                        key={`gantt-${selectedYard}-${filteredPlan.length}`}
                        planData={filteredPlan}
                        humanPlanData={filteredHumanPlan}
                        onBarRowChange={editHook.applyRowEdit}
                        onBarDateShift={editHook.applyDateShift}
                        onDragError={setDragError}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Drag error */}
          {dragError && (
            <div className="ws-drag-error" role="alert">
              {dragError}
              <button onClick={() => setDragError(null)} aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* Replan error */}
          {replanError && (
            <div className="ws-drag-error" role="alert">
              {replanError}
              <button onClick={() => setReplanError(null)} aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* Streaming indicator */}
          {isReplanMode && isReplanning && (
            <div className="ws-streaming-card">
              <div className="ws-streaming-header">
                <span className="ws-streaming-dot" />
                AI is analyzing your changes…
              </div>
              {streamingText && (
                <pre className="ws-streaming-text">{streamingText}</pre>
              )}
            </div>
          )}

          {/* AI Reasoning + Approval (replan mode only) */}
          {isReplanMode && reasoning && (
            <>
              <AIReasoningPanel
                reasoning={reasoning}
                selectedBarId={_selectedBarId}
                model={replanModel}
              />
              {pendingProposal && (() => {
                // Filter to only rows that actually differ from original
                const makeKey = (r: any) => `${r.project_id}::${r.project_name}`;
                const fields = ['resource', 'start_date', 'end_date', 'duration_days'] as const;
                const realChanges: { row: any; orig: any; diffs: string[]; isNew: boolean }[] = [];

                for (const row of pendingProposal.changed_rows) {
                  const orig = editHook.plan.find(r => makeKey(r) === makeKey(row));
                  if (!orig) {
                    realChanges.push({ row, orig: null, diffs: [], isNew: true });
                  } else {
                    const diffs = fields.filter(f => String(orig[f] ?? '') !== String(row[f] ?? ''));
                    if (diffs.length > 0) {
                      realChanges.push({ row, orig, diffs, isNew: false });
                    }
                  }
                }

                // Build project context changes
                const contextChanges: { field: string; before: string; after: string }[] = [];
                if (lastReplanChanges) {
                  const cfg = summary.config;
                  if (lastReplanChanges.hull_length && lastReplanChanges.hull_length !== (cfg.hull_length || ''))
                    contextChanges.push({ field: 'Hull Length', before: cfg.hull_length ? `${cfg.hull_length}m` : '—', after: `${lastReplanChanges.hull_length}m` });
                  if (lastReplanChanges.hull_width && lastReplanChanges.hull_width !== (cfg.hull_width || ''))
                    contextChanges.push({ field: 'Hull Width', before: cfg.hull_width ? `${cfg.hull_width}m` : '—', after: `${lastReplanChanges.hull_width}m` });
                  if (lastReplanChanges.hull_height && lastReplanChanges.hull_height !== (cfg.hull_height || ''))
                    contextChanges.push({ field: 'Hull Height', before: cfg.hull_height ? `${cfg.hull_height}m` : '—', after: `${lastReplanChanges.hull_height}m` });
                  if (lastReplanChanges.topside_weight && lastReplanChanges.topside_weight !== (cfg.topside_weight || ''))
                    contextChanges.push({ field: 'Topside Weight', before: cfg.topside_weight ? `${cfg.topside_weight}t` : '—', after: `${lastReplanChanges.topside_weight}t` });
                  if (lastReplanChanges.preferred_yard && lastReplanChanges.preferred_yard !== (cfg.preferred_yard || ''))
                    contextChanges.push({ field: 'Preferred Yard', before: cfg.preferred_yard || '—', after: lastReplanChanges.preferred_yard });
                  if (lastReplanChanges.preferred_location && lastReplanChanges.preferred_location !== (cfg.preferred_location || ''))
                    contextChanges.push({ field: 'Location', before: cfg.preferred_location || '—', after: lastReplanChanges.preferred_location });
                  if (lastReplanChanges.free_text)
                    contextChanges.push({ field: 'Constraints', before: '—', after: lastReplanChanges.free_text.split('\n')[0] + (lastReplanChanges.free_text.includes('\n') ? '...' : '') });
                }

                const totalChanges = contextChanges.length + realChanges.length;

                return (
                  <div className="ws-approval-card">
                    <div className="ws-approval-header">
                      <span className="ws-approval-info">
                        {totalChanges} change{totalChanges !== 1 ? 's' : ''} to apply
                      </span>
                      <div className="ws-approval-actions">
                        <button className="ws-approve-btn" onClick={handleApproveProposal}>
                          Apply Changes
                        </button>
                        <button className="ws-discard-btn" onClick={handleDiscardProposal}>
                          Discard
                        </button>
                      </div>
                    </div>
                    {contextChanges.length > 0 && (
                      <div className="ws-approval-context">
                        <div className="ws-ac-label">Project Context Updates</div>
                        <table className="ws-approval-table">
                          <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
                          <tbody>
                            {contextChanges.map((c, i) => (
                              <tr key={i}>
                                <td className="ws-at-field">{c.field}</td>
                                <td className="ws-at-before">{c.before}</td>
                                <td className="ws-at-after">{c.after}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {realChanges.length > 0 ? (
                      <table className="ws-approval-table">
                        <thead>
                          <tr>
                            <th>Project / Phase</th>
                            <th>Field</th>
                            <th>Before</th>
                            <th>After</th>
                          </tr>
                        </thead>
                        <tbody>
                          {realChanges.map(({ row, orig, diffs, isNew }, i) => {
                            if (isNew) {
                              return (
                                <tr key={i}>
                                  <td className="ws-at-project">{row.project_id} — {row.project_name}</td>
                                  <td colSpan={3} className="ws-at-new">New: {row.resource} · {row.start_date} → {row.end_date} · {row.duration_days}d</td>
                                </tr>
                              );
                            }
                            return diffs.map((field, j) => (
                              <tr key={`${i}-${j}`}>
                                {j === 0 && (
                                  <td className="ws-at-project" rowSpan={diffs.length}>
                                    {row.project_id}<br/><span className="ws-at-phase">{row.project_name}</span>
                                  </td>
                                )}
                                <td className="ws-at-field">
                                  {field === 'resource' ? 'Yard' : field === 'start_date' ? 'Start' : field === 'end_date' ? 'End' : 'Duration'}
                                </td>
                                <td className="ws-at-before">{String(orig?.[field] ?? '—')}{field === 'duration_days' ? 'd' : ''}</td>
                                <td className="ws-at-after">{String(row[field] ?? '—')}{field === 'duration_days' ? 'd' : ''}</td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ padding: '1rem 1.25rem', color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
                        No actual differences found — AI returned the same values.
                      </p>
                    )}
                  </div>
                );
              })()}
              {!pendingProposal && reasoning && (
                <p className="ws-applied-note">Changes applied to plan.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
