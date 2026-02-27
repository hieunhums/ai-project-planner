import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GanttChart from '../components/GanttChart';
import { buildProjectPath } from '../routes';
import './GanttPage.css';

export const GanttPage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const numericProjectId = projectId ? Number(projectId) : null;

  const handleBack = () => {
    if (numericProjectId) {
      navigate(buildProjectPath(numericProjectId));
    }
  };

  return (
    <div className="gantt-page">
      <div className="gantt-page-nav">
        <button className="back-btn" onClick={handleBack}>
          ← Back to project
        </button>

        <div className="gantt-page-badges">
          <span className="badge badge-human">Human Plan</span>
          <span className="badge-divider">vs</span>
          <span className="badge badge-ai">AI Augmented Plan</span>
        </div>
      </div>

      <div className="gantt-page-card">
        <GanttChart />
      </div>
    </div>
  );
};
