import { useState, useCallback } from 'react';
import { fetchCapacityPlan } from '../services/api';
import { savePlanState } from '../services/session';
import type { CapacityPlanRow, CapacityPlanResponse } from '../services/types';

export interface UseCapacityPlanReturn {
  plan: CapacityPlanRow[];
  rationale: string;
  isLoading: boolean;
  error: string | null;
  /** Returns true on success, false on error */
  load: (selectedYards: string[], prompt: string) => Promise<boolean>;
  reset: () => void;
}

export function useCapacityPlan(projectId: number): UseCapacityPlanReturn {
  const [plan, setPlan] = useState<CapacityPlanRow[]>([]);
  const [rationale, setRationale] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selectedYards: string[], prompt: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result: CapacityPlanResponse = await fetchCapacityPlan(
          projectId,
          selectedYards,
          prompt
        );
        setPlan(result.plan);
        setRationale(result.rationale);
        // Persist to sessionStorage for GanttPage
        savePlanState(projectId, result.plan, result.rationale);
        return true;
      } catch (err) {
        const msg =
          (err as Error).name === 'AbortError' || (err as Error).message.includes('timed out')
            ? 'Request timed out. Please try again.'
            : err instanceof Error
            ? err.message
            : 'Failed to generate capacity plan';
        setError(msg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  const reset = useCallback(() => {
    setPlan([]);
    setRationale('');
    setError(null);
    setIsLoading(false);
  }, []);

  return { plan, rationale, isLoading, error, load, reset };
}
