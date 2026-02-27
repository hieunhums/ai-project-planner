import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { ProjectUploadsList } from '../components/ProjectUploadsList';
import { ProjectGeneratedPlansList } from '../components/ProjectGeneratedPlansList';
import { usePlanGeneration } from '../hooks/usePlanGeneration';
import { useProjectDetail } from '../hooks/useProjectDetail';
import { buildGanttPath } from '../routes';
import './ProjectLandingPage.css';

export const ProjectLandingPage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const numericProjectId = projectId ? Number(projectId) : null;

  // Step 1 — upload current plan
  const [uploadedPlanId, setUploadedPlanId] = useState<number | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{
    taskCount: number;
    resourceCount: number;
  } | null>(null);

  // Step 2 — upload new project details (mocked: no backend call)
  const [projectDetailsFile, setProjectDetailsFile] = useState<File | null>(null);
  const [projectDetailsUploaded, setProjectDetailsUploaded] = useState(false);
  const detailsInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const { project, isLoading, error, refresh } = useProjectDetail(numericProjectId);
  const { generatePlan, isGenerating, progress, error: generationError } = usePlanGeneration();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 6000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message]);

  // Step 1 handlers
  const handleUploadSuccess = (planId: number, taskCount: number, resourceCount: number) => {
    setUploadedPlanId(planId);
    setUploadInfo({ taskCount, resourceCount });
    setMessage({
      type: 'success',
      text: `Current plan uploaded. ${taskCount} tasks and ${resourceCount} resources found.`,
    });
    refresh();
  };

  const handleUploadError = (errorMessage: string) => {
    setMessage({ type: 'error', text: errorMessage });
  };

  // Step 2 — mock project details upload (no backend)
  const handleDetailsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setProjectDetailsFile(file);
    // Simulate a short processing delay for demo effect
    setTimeout(() => {
      setProjectDetailsUploaded(true);
      setMessage({ type: 'success', text: `Project details "${file.name}" loaded successfully.` });
    }, 600);
  };

  // Step 3 — generate optimized plan then redirect to Gantt page
  const handleGeneratePlan = async () => {
    if (!uploadedPlanId || !numericProjectId) return;
    setMessage(null);
    const result = await generatePlan({ planId: uploadedPlanId });

    if (result) {
      refresh();
      // Navigate to Gantt visualisation
      navigate(buildGanttPath(numericProjectId));
    } else if (generationError) {
      setMessage({ type: 'error', text: generationError });
    }
  };

  if (!numericProjectId || Number.isNaN(numericProjectId)) {
    return <div className="project-error">Invalid project selection.</div>;
  }

  // Workflow step indicators
  const step1Done = !!uploadedPlanId;
  const step2Done = projectDetailsUploaded;
  const readyToGenerate = step1Done && step2Done;

  return (
    <div className="project-landing">
      <div className="project-heading">
        <div>
          <p className="project-label">Project</p>
          <h1>{project?.name || 'Loading project...'}</h1>
        </div>
        <div className="project-meta">
          <span>{project?.uploads.length ?? 0} uploads</span>
          <span>{project?.generated_plans.length ?? 0} plans</span>
        </div>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="close-btn">
            ✕
          </button>
        </div>
      )}

      {/* ── Workflow steps ──────────────────────────────────────────────── */}
      <div className="workflow-steps">
        {/* Step 1 — Upload current plan */}
        <div className={`workflow-step ${step1Done ? 'step-done' : 'step-active'}`}>
          <div className="step-indicator">
            {step1Done ? (
              <span className="step-check">✓</span>
            ) : (
              <span className="step-number">1</span>
            )}
          </div>
          <div className="step-body">
            <h3 className="step-title">Upload current project plan</h3>
            <p className="step-desc">
              Upload your existing schedule as a CSV file (columns: project_id, resource,
              start_date, end_date).
            </p>

            {!step1Done ? (
              <FileUpload
                projectId={numericProjectId}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            ) : (
              <div className="step-done-info">
                <span>Plan ID {uploadedPlanId}</span>
                <span>·</span>
                <span>{uploadInfo?.taskCount} tasks</span>
                <span>·</span>
                <span>{uploadInfo?.resourceCount} resources</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 — Upload new project details */}
        <div
          className={`workflow-step ${
            !step1Done ? 'step-locked' : step2Done ? 'step-done' : 'step-active'
          }`}
        >
          <div className="step-indicator">
            {step2Done ? (
              <span className="step-check">✓</span>
            ) : (
              <span className="step-number">2</span>
            )}
          </div>
          <div className="step-body">
            <h3 className="step-title">Upload new project details</h3>
            <p className="step-desc">
              Provide the new project requirements CSV. The AI will use this to suggest
              optimised scheduling additions.
            </p>

            {step1Done && !step2Done && (
              <div className="file-drop-zone" onClick={() => detailsInputRef.current?.click()}>
                <input
                  ref={detailsInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden-input"
                  onChange={handleDetailsFileChange}
                />
                <span className="drop-icon">📄</span>
                <span className="drop-label">Click to select details CSV</span>
              </div>
            )}

            {step2Done && projectDetailsFile && (
              <div className="step-done-info">
                <span>{projectDetailsFile.name}</span>
                <span>·</span>
                <span>{(projectDetailsFile.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3 — Generate optimized plan */}
        <div
          className={`workflow-step ${
            !readyToGenerate ? 'step-locked' : 'step-active'
          }`}
        >
          <div className="step-indicator">
            <span className="step-number">3</span>
          </div>
          <div className="step-body">
            <h3 className="step-title">Generate new project optimisation plan</h3>
            <p className="step-desc">
              The AI analyses your current schedule and new projects to produce an optimised,
              resource-balanced plan.
            </p>

            {readyToGenerate && (
              <>
                <button
                  onClick={handleGeneratePlan}
                  className="generate-btn"
                  disabled={isGenerating}
                >
                  {isGenerating
                    ? `Generating… (${progress}%)`
                    : '✦ Generate new project optimisation plan'}
                </button>

                {isGenerating && (
                  <div className="progress-info">
                    <p>AI reasoning in progress… This may take a moment.</p>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading && <div className="project-status">Loading project details…</div>}
      {error && <div className="project-error">{error}</div>}

      <div className="project-artifacts">
        {project && project.uploads.length > 0 && (
          <ProjectUploadsList uploads={project.uploads} />
        )}
        {project && project.generated_plans.length > 0 && (
          <ProjectGeneratedPlansList plans={project.generated_plans} />
        )}
      </div>
    </div>
  );
};
