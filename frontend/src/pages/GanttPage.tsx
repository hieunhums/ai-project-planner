import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toPng } from 'html-to-image';
import GanttChart from '../components/GanttChart';
import { GanttNLEdit } from '../components/GanttNLEdit';
import { buildProjectPath, buildProposalPath } from '../routes';
import { loadPlanState, loadHumanPlanState } from '../services/session';
import { useGanttEdit } from '../hooks/useGanttEdit';
import type { CapacityPlanRow } from '../services/types';
import './GanttPage.css';

export const GanttPage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const numericProjectId = projectId ? Number(projectId) : null;

  const chartRef = useRef<HTMLDivElement>(null);

  // Load from session synchronously — sessionStorage reads are synchronous
  const [sessionPlan] = useState<CapacityPlanRow[]>(() => {
    if (!numericProjectId) return [];
    const state = loadPlanState(numericProjectId);
    return state?.plan ?? [];
  });
  const [humanPlanData] = useState<CapacityPlanRow[]>(() => {
    if (!numericProjectId) return [];
    return loadHumanPlanState(numericProjectId) ?? [];
  });

  const noPlan = !numericProjectId || sessionPlan.length === 0;

  // Wire NL editing hook
  const editHook = useGanttEdit(numericProjectId ?? 0, sessionPlan);
  const [dragError, setDragError] = useState<string | null>(null);

  const handleBack = () => {
    if (numericProjectId) {
      navigate(buildProjectPath(numericProjectId));
    }
  };

  // ── Export handlers ───────────────────────────────────────────────────────
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
      [
        r.project_id ?? '',
        (r.project_name ?? '').replace(/,/g, ';'),
        r.duration_days ?? '',
        r.start_date ?? '',
        r.end_date ?? '',
        r.resource ?? '',
        (r.dependencies ?? '').replace(/,/g, ';'),
        r.cost ?? '',
        r.priority ?? '',
      ].join(',')
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

  // ── No plan state ──────────────────────────────────────────────────────
  if (noPlan) {
    return (
      <div className="gantt-page">
        <div className="gantt-no-plan">
          <p>No capacity plan is loaded for this project.</p>
          {numericProjectId && (
            <button
              className="back-btn"
              onClick={() => navigate(buildProposalPath(numericProjectId))}
            >
              ← Back to Project Details
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-page">
      <div className="gantt-page-nav">
        <button className="back-btn" onClick={handleBack}>
          ← Back to project
        </button>

        <div className="gantt-page-actions">
          <button
            className="btn btn-secondary gantt-undo-btn"
            disabled={!editHook.canUndo || editHook.isLoading}
            onClick={editHook.undo}
            title="Undo last edit"
          >
            ↩ Undo
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadPng}
            title="Download chart as PNG"
          >
            ⬇ Chart PNG
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadCsv}
            title="Download plan as CSV"
          >
            ⬇ Plan CSV
          </button>
        </div>

        <div className="gantt-page-badges">
          <span className="badge badge-human">Human Plan</span>
          <span className="badge-divider">vs</span>
          <span className="badge badge-ai">AI Capacity Plan</span>
        </div>
      </div>

      {/* Chart */}
      <div className="gantt-page-card" ref={chartRef}>
        <GanttChart
          planData={editHook.plan}
          humanPlanData={humanPlanData}
          onBarRowChange={editHook.applyRowEdit}
          onBarDateShift={editHook.applyDateShift}
          onDragError={setDragError}
        />
      </div>

      {/* Drag error banner */}
      {dragError && (
        <div className="gantt-drag-error" role="alert">
          {dragError}
          <button onClick={() => setDragError(null)} className="gantt-drag-error-close" aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* NL edit bar — below the chart */}
      <div className="gantt-nl-wrapper">
        <GanttNLEdit
          onSubmit={editHook.applyNLEdit}
          isLoading={editHook.isLoading}
          error={editHook.error}
        />
      </div>
    </div>
  );
};
