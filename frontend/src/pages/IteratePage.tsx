import React, { useState } from 'react';
import { ConstraintEditor } from '../components/ConstraintEditor';
import { PlanDetails } from '../components/PlanDetails';
import { api } from '../services/api';
import type { Plan } from '../services/types';
import './IteratePage.css';

export const IteratePage: React.FC = () => {
  const [planId, setPlanId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatedPlan, setUpdatedPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (constraints: Record<string, any>) => {
    if (!planId || typeof planId !== 'number') return;

    setIsSubmitting(true);
    setError(null);

    try {
      const plan = await api.updateConstraints(planId, constraints, true);
      setUpdatedPlan(plan);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate plan';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="iterate-page">
      <header>
        <h1>Iterate on Constraints</h1>
        <p>Adjust constraint assumptions and regenerate a new AI plan.</p>
      </header>

      <div className="plan-id-card">
        <label>
          Base Plan ID
          <input
            type="number"
            value={planId}
            onChange={(event) =>
              setPlanId(event.target.value ? Number(event.target.value) : '')
            }
            placeholder="Enter a plan ID to iterate"
          />
        </label>
      </div>

      <ConstraintEditor onSubmit={handleSubmit} isSubmitting={isSubmitting} />

      {error && <div className="notice error">{error}</div>}

      {updatedPlan && <PlanDetails plan={updatedPlan} />}
    </div>
  );
};
