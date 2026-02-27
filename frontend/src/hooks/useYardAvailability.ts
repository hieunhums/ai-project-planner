import { useState, useCallback } from 'react';
import { fetchYardAvailability } from '../services/api';
import { saveAvailabilityState } from '../services/session';
import type { YardAvailabilityRow } from '../services/types';

export interface UseYardAvailabilityReturn {
  yards: YardAvailabilityRow[];
  isLoading: boolean;
  error: string | null;
  selectedYards: string[];
  setSelectedYards: (yards: string[]) => void;
  /** Returns true on success, false on error */
  load: () => Promise<boolean>;
  reset: () => void;
}

export function useYardAvailability(projectId: number): UseYardAvailabilityReturn {
  const [yards, setYards] = useState<YardAvailabilityRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYards, setSelectedYards] = useState<string[]>([]);

  const load = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    // Do NOT clear existing yards on re-load — spec says:
    // "sets error (does not clear yards) on timeout abort"
    setError(null);

    try {
      const rows = await fetchYardAvailability(projectId);
      setYards(rows);
      saveAvailabilityState(projectId, rows);
      return true;
    } catch (err) {
      const msg =
        (err as Error).name === 'AbortError' || (err as Error).message.includes('timed out')
          ? 'Request timed out. Please try again.'
          : (err instanceof Error ? err.message : 'Failed to fetch yard availability');
      setError(msg);
      // Do NOT clear yards — keep previous data visible if available
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const reset = useCallback(() => {
    setYards([]);
    setSelectedYards([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { yards, isLoading, error, selectedYards, setSelectedYards, load, reset };
}
