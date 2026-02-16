import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { ProjectUploadsList } from '../components/ProjectUploadsList';
import { ProjectGeneratedPlansList } from '../components/ProjectGeneratedPlansList';
import { usePlanGeneration } from '../hooks/usePlanGeneration';
import { useProjectDetail } from '../hooks/useProjectDetail';
import './ProjectLandingPage.css';

export const ProjectLandingPage: React.FC = () => {
  const { projectId } = useParams();
  const numericProjectId = projectId ? Number(projectId) : null;
  const [uploadedPlanId, setUploadedPlanId] = useState<number | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{
    taskCount: number;
    resourceCount: number;
  } | null>(null);
  const [aiPlanId, setAiPlanId] = useState<number | null>(null);
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const { project, isLoading, error, refresh } = useProjectDetail(numericProjectId);
  const { generatePlan, isGenerating, progress, error: generationError } = usePlanGeneration();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message]);

  const handleUploadSuccess = (planId: number, taskCount: number, resourceCount: number) => {
    setUploadedPlanId(planId);
    setUploadInfo({ taskCount, resourceCount });
    setMessage({
      type: 'success',
      text: `Plan uploaded successfully. ${taskCount} tasks and ${resourceCount} resources found.`,
    });
    setAiPlanId(null);
    setAiMetrics(null);
    refresh();
  };

  const handleUploadError = (errorMessage: string) => {
    setMessage({ type: 'error', text: errorMessage });
  };

  const handleGeneratePlan = async () => {
    if (!uploadedPlanId) return;
    setMessage(null);
    const result = await generatePlan({ planId: uploadedPlanId });

    if (result) {
      setAiPlanId(result.aiPlanId);
      setAiMetrics(result.metrics);
      setMessage({
        type: 'success',
        text: `AI plan generated successfully. Duration: ${result.metrics.total_duration_days.toFixed(
          1
        )} days`,
      });
      refresh();
    } else if (generationError) {
      setMessage({ type: 'error', text: generationError });
    }
  };

  if (!numericProjectId || Number.isNaN(numericProjectId)) {
    return <div className="project-error">Invalid project selection.</div>;
  }

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
            Close
          </button>
        </div>
      )}

      <div className="project-actions">
        <div className="card">
          <h2>Upload planning data</h2>
          <p className="card-description">
            Add a planning spreadsheet to this project. Existing uploads stay available.
          </p>
          <FileUpload
            projectId={numericProjectId}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>

        {uploadedPlanId && uploadInfo && (
          <div className="card">
            <h2>Generate AI plan</h2>
            <p className="card-description">
              Generate an optimized plan from the latest upload.
            </p>

            <div className="plan-info">
              <div className="info-item">
                <span className="label">Plan ID:</span>
                <span className="value">{uploadedPlanId}</span>
              </div>
              <div className="info-item">
                <span className="label">Tasks:</span>
                <span className="value">{uploadInfo.taskCount}</span>
              </div>
              <div className="info-item">
                <span className="label">Resources:</span>
                <span className="value">{uploadInfo.resourceCount}</span>
              </div>
            </div>

            <button
              onClick={handleGeneratePlan}
              className="generate-btn"
              disabled={isGenerating}
            >
              {isGenerating ? `Generating... (${progress}%)` : 'Generate AI Plan'}
            </button>

            {isGenerating && (
              <div className="progress-info">
                <p>AI reasoning in progress... This may take a few minutes.</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {aiPlanId && aiMetrics && (
          <div className="card success-card">
            <h2>AI plan generated</h2>
            <p className="card-description">
              Your optimized plan is ready. Review key metrics below.
            </p>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Total Duration</div>
                <div className="metric-value">{aiMetrics.total_duration_days.toFixed(1)} days</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Capacity Utilization</div>
                <div className="metric-value">{aiMetrics.capacity_utilization.toFixed(1)}%</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Total Cost</div>
                <div className="metric-value">${aiMetrics.total_cost.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading && <div className="project-status">Loading project details...</div>}
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
