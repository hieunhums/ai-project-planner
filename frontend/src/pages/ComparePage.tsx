import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlanComparison } from '../hooks/usePlanComparison';
import { api } from '../services/api';
import type { Plan } from '../services/types';
import { PlanComparison } from '../components/PlanComparison';
import { PlanDetails } from '../components/PlanDetails';
import { RecommendationPanel } from '../components/RecommendationPanel';
import { ExportPanel } from '../components/ExportPanel';
import './ComparePage.css';

export const ComparePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [planId1, setPlanId1] = useState<number | ''>('');
  const [planId2, setPlanId2] = useState<number | ''>('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const selectedPlanId = selectedPlan?.id ?? (typeof planId2 === 'number' ? planId2 : undefined);

  const { comparePlans, isComparing, comparison, error } = usePlanComparison();

  useEffect(() => {
    const humanId = Number(searchParams.get('human'));
    const aiId = Number(searchParams.get('ai'));
    if (!Number.isNaN(humanId) && humanId > 0) {
      setPlanId1(humanId);
    }
    if (!Number.isNaN(aiId) && aiId > 0) {
      setPlanId2(aiId);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId2 || typeof planId2 !== 'number') return;
      try {
        const plan = await api.getPlanDetails(planId2);
        setSelectedPlan(plan);
        setPlanError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load plan details';
        setPlanError(message);
      }
    };

    fetchPlan();
  }, [planId2]);

  const handleCompare = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planId1 || !planId2) return;
    await comparePlans({ planId1: Number(planId1), planId2: Number(planId2) });
  };

  return (
    <div className="compare-page">
      <header>
        <h1>Compare Plans</h1>
        <p>Review AI recommendations against the original plan.</p>
      </header>

      <form className="compare-form" onSubmit={handleCompare}>
        <label>
          Human Plan ID
          <input
            type="number"
            value={planId1}
            onChange={(event) =>
              setPlanId1(event.target.value ? Number(event.target.value) : '')
            }
            placeholder="e.g., 1"
          />
        </label>
        <label>
          AI Plan ID
          <input
            type="number"
            value={planId2}
            onChange={(event) =>
              setPlanId2(event.target.value ? Number(event.target.value) : '')
            }
            placeholder="e.g., 2"
          />
        </label>
        <button type="submit" disabled={isComparing}>
          {isComparing ? 'Comparing...' : 'Compare Plans'}
        </button>
      </form>

      {error && <div className="notice error">{error}</div>}

      {comparison && <PlanComparison comparison={comparison} />}

      {planError && <div className="notice error">{planError}</div>}

      {selectedPlan && (
        <div className="details-section">
          <PlanDetails plan={selectedPlan} />
          <RecommendationPanel
            planId={selectedPlanId ?? 0}
            recommendations={selectedPlan.recommendations}
            onUpdate={(next) =>
              setSelectedPlan((prev) => (prev ? { ...prev, recommendations: next } : prev))
            }
          />
          <ExportPanel planId={selectedPlanId ?? 0} planName={selectedPlan.name} />
        </div>
      )}
    </div>
  );
};
