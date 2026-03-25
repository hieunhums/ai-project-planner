import { useState } from 'react';
import { api } from '../services/api';
import type { PlanComparison } from '../services/types';

interface CompareOptions {
  planId1: number;
  planId2: number;
}

export const usePlanComparison = () => {
  const [isComparing, setIsComparing] = useState(false);
  const [comparison, setComparison] = useState<PlanComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  const comparePlans = async (options: CompareOptions): Promise<PlanComparison | null> => {
    setIsComparing(true);
    setError(null);

    try {
      const result = await api.comparePlans(options.planId1, options.planId2);
      setComparison(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to compare plans';
      setError(message);
      return null;
    } finally {
      setIsComparing(false);
    }
  };

  const reset = () => {
    setComparison(null);
    setError(null);
    setIsComparing(false);
  };

  return {
    comparePlans,
    isComparing,
    comparison,
    error,
    reset,
  };
};
