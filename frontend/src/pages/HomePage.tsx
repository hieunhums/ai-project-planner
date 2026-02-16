import React, { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { usePlanGeneration } from '../hooks/usePlanGeneration';
import './HomePage.css';

export const HomePage: React.FC = () => {
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

  const { generatePlan, isGenerating, progress, error: generationError } = usePlanGeneration();

  const handleUploadSuccess = (planId: number, taskCount: number, resourceCount: number) => {
    setUploadedPlanId(planId);
    setUploadInfo({ taskCount, resourceCount });
    setMessage({
      type: 'success',
      text: `Plan uploaded successfully! ${taskCount} tasks and ${resourceCount} resources found.`,
    });
    setAiPlanId(null);
    setAiMetrics(null);
  };

  const handleUploadError = (error: string) => {
    setMessage({ type: 'error', text: error });
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
        text: `AI plan generated successfully! Duration: ${result.metrics.total_duration_days.toFixed(1)} days`,
      });
    } else if (generationError) {
      setMessage({ type: 'error', text: generationError });
    }
  };

  const clearMessage = () => {
    setTimeout(() => setMessage(null), 5000);
  };

  React.useEffect(() => {
    if (message) {
      clearMessage();
    }
  }, [message]);

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>AI-Augmented Planning Assistant</h1>
        <p className="subtitle">
          Optimize shipyard and port logistics plans with AI-powered reasoning
        </p>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="close-btn">
            ✕
          </button>
        </div>
      )}

      <div className="content-section">
        <div className="card">
          <h2>1. Upload Planning Data</h2>
          <p className="card-description">
            Upload your planning spreadsheet (CSV or Excel) with tasks, resources, and
            constraints.
          </p>
          <FileUpload
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>

        {uploadedPlanId && uploadInfo && (
          <div className="card">
            <h2>2. Generate AI Plan</h2>
            <p className="card-description">
              Generate an optimized plan using Azure OpenAI reasoning models.
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
              {isGenerating ? (
                <>
                  <span className="spinner"></span>
                  Generating... ({progress}%)
                </>
              ) : (
                'Generate AI Plan'
              )}
            </button>

            {isGenerating && (
              <div className="progress-info">
                <p>AI reasoning in progress... This may take 3-5 minutes.</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {aiPlanId && aiMetrics && (
          <div className="card success-card">
            <h2>✅ AI Plan Generated</h2>
            <p className="card-description">
              Your optimized plan is ready! Here are the key metrics:
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
                <div className="metric-value">
                  ${aiMetrics.total_cost.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button
                onClick={() => window.open(`http://localhost:8000/api/plans/${aiPlanId}`, '_blank')}
                className="view-btn"
              >
                View Full Plan (JSON)
              </button>
              <button
                onClick={() => {
                  /* Future: Navigate to comparison page */
                  alert('Comparison view coming in Phase 4!');
                }}
                className="compare-btn"
              >
                Compare with Original
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
