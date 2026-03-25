import React from 'react';
import type { GeneratedPlanSummary } from '../services/types';
import './ProjectGeneratedPlansList.css';

interface ProjectGeneratedPlansListProps {
  plans: GeneratedPlanSummary[];
}

const formatDateTime = (value?: string) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ProjectGeneratedPlansList: React.FC<ProjectGeneratedPlansListProps> = ({
  plans,
}) => {
  return (
    <section className="artifact-section">
      <div className="artifact-header">
        <h3>Generated plans</h3>
        <span className="artifact-count">{plans.length}</span>
      </div>
      <div className="artifact-list">
        {plans.map((plan) => (
          <div key={plan.plan_id} className="artifact-row">
            <div>
              <div className="artifact-title">{plan.name}</div>
              <div className="artifact-meta">{formatDateTime(plan.generated_at)}</div>
            </div>
            <span className="artifact-status">{plan.status_label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
