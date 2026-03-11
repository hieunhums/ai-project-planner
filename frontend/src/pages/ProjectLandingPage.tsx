import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectDetail } from '../hooks/useProjectDetail';
import { useProjectDetails } from '../hooks/useProjectDetails';
import { useYardAvailability } from '../hooks/useYardAvailability';
import { useCapacityPlan } from '../hooks/useCapacityPlan';
import { ProjectDetailsForm } from '../components/ProjectDetailsForm';
import { YardAvailabilityTable } from '../components/YardAvailabilityTable';
import { CapacityAssessmentPanel } from '../components/CapacityAssessmentPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Spinner } from '../components/Spinner';
import type { SaveProjectDetailsResponse } from '../services/api';
import { clearAvailabilityState, clearPlanState, loadPlanState } from '../services/session';
import { buildGanttPath } from '../routes';
import './ProjectLandingPage.css';

export const ProjectLandingPage: React.FC = () => {
  const { projectId } = useParams();
  const numericProjectId = projectId ? Number(projectId) : null;
  const navigate = useNavigate();

  // ── Phase state ────────────────────────────────────────────────────────
  // phase 1 = details form, phase 2 = availability results, phase 3 = capacity assessment
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [submitWarnings, setSubmitWarnings] = useState<string[]>([]);

  // Re-run confirm dialog
  const [showReRunConfirm, setShowReRunConfirm] = useState(false);
  const [pendingAssessPrompt, setPendingAssessPrompt] = useState<string>('');

  // ── Load existing project metadata ─────────────────────────────────────
  const { project, isLoading: isProjectLoading } = useProjectDetail(numericProjectId);

  // ── Form hook ──────────────────────────────────────────────────────────
  const detailsHook = useProjectDetails(
    numericProjectId ?? 0,
    project?.name ?? ''
  );

  // ── Availability hook ─────────────────────────────────────────────────
  const availabilityHook = useYardAvailability(numericProjectId ?? 0);

  // ── Capacity plan hook ────────────────────────────────────────────────
  const capacityHook = useCapacityPlan(numericProjectId ?? 0);

  // ── Handlers ───────────────────────────────────────────────────────────

  /** Called by ProjectDetailsForm after a successful save. */
  const handleGenerateOptions = async (saveResult: SaveProjectDetailsResponse) => {
    if (!numericProjectId) return;
    setSubmitWarnings(saveResult.warnings ?? []);
    const ok = await availabilityHook.load();
    if (ok) {
      setPhase(2);
    }
  };

  /** Called by CapacityAssessmentPanel "Assess Capacity" button. */
  const handleAssessCapacity = async (prompt: string) => {
    if (!numericProjectId) return;
    // If a plan already exists in session, confirm clearing before re-running
    const existing = loadPlanState(numericProjectId);
    if (existing) {
      setPendingAssessPrompt(prompt);
      setShowReRunConfirm(true);
      return;
    }
    await runCapacityAssessment(prompt);
  };

  const runCapacityAssessment = async (prompt: string) => {
    if (!numericProjectId) return;
    const ok = await capacityHook.load(availabilityHook.selectedYards, prompt);
    if (ok) {
      setPhase(3);
    }
  };

  const handleConfirmReRun = async () => {
    if (!numericProjectId) return;
    setShowReRunConfirm(false);
    clearAvailabilityState(numericProjectId);
    clearPlanState(numericProjectId);
    availabilityHook.reset();
    capacityHook.reset();
    setPhase(2);
    await runCapacityAssessment(pendingAssessPrompt);
  };

  const handleProceedToGantt = () => {
    if (!numericProjectId) return;
    navigate(buildGanttPath(numericProjectId));
  };

  // ── Guard ──────────────────────────────────────────────────────────────
  if (!numericProjectId || Number.isNaN(numericProjectId)) {
    return <div className="project-error">Invalid project selection.</div>;
  }

  const projectName = project?.name || detailsHook.formValues.project_name || 'New Project';
  const isEnquiry = detailsHook.formValues.project_type === 'enquiry';

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="project-landing">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <header className="project-heading">
        <div className="project-heading-title">
          <p className="project-label">Project</p>
          <div className="project-title-row">
            <h1>
              {isProjectLoading ? 'Loading…' : projectName}
            </h1>
            {isEnquiry && (
              <span className="badge badge-enquiry">Enquiry</span>
            )}
          </div>
        </div>
      </header>

      {/* ── Submit warnings ───────────────────────────────────────────── */}
      {submitWarnings.length > 0 && (
        <div className="proposal-warning-banner" role="alert">
          <strong>CSV warnings:</strong>
          <ul>
            {submitWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <button
            type="button"
            className="close-btn"
            onClick={() => setSubmitWarnings([])}
            aria-label="Dismiss warnings"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Phase 1: Project details form ────────────────────────────── */}
      <section className="proposal-phase proposal-phase--active">
        <div className="proposal-phase-header">
          <span className="proposal-phase-number">Phase 1</span>
          <h2 className="proposal-phase-title">Project Details</h2>
        </div>

        <ProjectDetailsForm
          hook={detailsHook}
          onGenerateOptions={handleGenerateOptions}
          isExternallyDisabled={availabilityHook.isLoading}
        />

        {availabilityHook.isLoading && (
          <div className="proposal-loading">
            <Spinner size="md" label="Fetching available yard options…" />
          </div>
        )}

        {availabilityHook.error && (
          <p className="proposal-error" role="alert">
            {availabilityHook.error}
          </p>
        )}
      </section>

      {/* ── Phase 2: Yard availability ──────────────────────────────── */}
      <section
        className="proposal-phase proposal-phase--availability"
        style={{ display: phase >= 2 ? undefined : 'none' }}
        aria-hidden={phase < 2}
      >
        <div className="proposal-phase-header">
          <span className="proposal-phase-number">Phase 2</span>
          <h2 className="proposal-phase-title">Available Options</h2>
        </div>

        {availabilityHook.yards.length > 0 ? (
          <YardAvailabilityTable
            yards={availabilityHook.yards}
            selectedYards={availabilityHook.selectedYards}
            onSelectionChange={availabilityHook.setSelectedYards}
          />
        ) : (
          <p className="proposal-placeholder">
            Yard availability results will appear here once generated.
          </p>
        )}
      </section>

      {/* ── Phase 3: Capacity assessment ────────────────────────────── */}
      <section
        className="proposal-phase proposal-phase--capacity"
        style={{ display: availabilityHook.selectedYards.length > 0 ? undefined : 'none' }}
        aria-hidden={availabilityHook.selectedYards.length === 0}
      >
        <div className="proposal-phase-header">
          <span className="proposal-phase-number">Phase 3</span>
          <h2 className="proposal-phase-title">Capacity Assessment</h2>
        </div>

        <CapacityAssessmentPanel
          selectedYards={availabilityHook.selectedYards}
          onAssess={handleAssessCapacity}
          isLoading={capacityHook.isLoading}
          plan={capacityHook.plan}
          rationale={capacityHook.rationale}
          error={capacityHook.error}
          onProceedToGantt={handleProceedToGantt}
        />
      </section>

      {/* ── Re-run confirm dialog ─────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={showReRunConfirm}
        title="Re-run Capacity Assessment?"
        message="This will clear all existing availability and plan results. Continue?"
        confirmLabel="Clear & Re-run"
        cancelLabel="Cancel"
        isDangerous={true}
        onConfirm={handleConfirmReRun}
        onCancel={() => setShowReRunConfirm(false)}
      />

    </div>
  );
};
