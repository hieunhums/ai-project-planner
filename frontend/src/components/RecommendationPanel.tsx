import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Recommendation, RecommendationDecisionResponse } from '../services/types';
import './RecommendationPanel.css';

interface RecommendationPanelProps {
  planId: number;
  recommendations: Recommendation[];
  onUpdate?: (recommendations: Recommendation[]) => void;
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  planId,
  recommendations,
  onUpdate,
}) => {
  const [localRecommendations, setLocalRecommendations] = useState<Recommendation[]>(
    recommendations
  );
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecommendations(recommendations);
  }, [recommendations]);

  const handleDecision = async (recommendation: Recommendation, accept: boolean) => {
    if (!recommendation.id) {
      setError('Recommendation id missing.');
      return;
    }

    setProcessingId(recommendation.id);
    setError(null);

    try {
      const result = (await api.acceptRecommendation(
        planId,
        recommendation.id,
        accept
      )) as RecommendationDecisionResponse;

      const updated = localRecommendations.map((item) =>
        item.id === recommendation.id ? { ...item, status: result.status } : item
      );
      setLocalRecommendations(updated);
      onUpdate?.(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update recommendation';
      setError(message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="recommendation-panel">
      <header>
        <div>
          <h2>AI Recommendations</h2>
          <p className="subtitle">Accept or reject AI suggestions to build a hybrid plan.</p>
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}

      <div className="recommendation-list">
        {localRecommendations.length === 0 ? (
          <div className="empty-state">No recommendations available for this plan.</div>
        ) : (
          localRecommendations.map((recommendation) => (
            <article key={recommendation.id ?? recommendation.rationale} className="card">
              <div className="card-header">
                <div>
                  <h3>{recommendation.recommendation_type}</h3>
                  <p className="rationale">{recommendation.rationale}</p>
                </div>
                <span className={`status ${recommendation.status}`}>
                  {statusLabels[recommendation.status] ?? recommendation.status}
                </span>
              </div>

              <div className="details">
                <div>
                  <span className="label">Affected</span>
                  <span className="value">{formatAffectedEntities(recommendation)}</span>
                </div>
                <div>
                  <span className="label">Impact</span>
                  <span className="value">{formatImpact(recommendation)}</span>
                </div>
              </div>

              <div className="actions">
                <button
                  type="button"
                  onClick={() => handleDecision(recommendation, true)}
                  disabled={processingId === recommendation.id}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => handleDecision(recommendation, false)}
                  disabled={processingId === recommendation.id}
                >
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

const formatAffectedEntities = (recommendation: Recommendation): string => {
  const affected = recommendation.affected_entities || {};
  if (affected.task_id) return `Task ${affected.task_id}`;
  if (affected.task_ids && affected.task_ids.length) return `Tasks ${affected.task_ids.join(', ')}`;
  if (affected.resource_id) return `Resource ${affected.resource_id}`;
  return 'Not specified';
};

const formatImpact = (recommendation: Recommendation): string => {
  const impact = recommendation.impact_metrics || {};
  const keys = Object.keys(impact);
  if (!keys.length) return 'No impact metrics provided';
  return keys.map((key) => `${key.replace(/_/g, ' ')}: ${impact[key]}`).join(' | ');
};
