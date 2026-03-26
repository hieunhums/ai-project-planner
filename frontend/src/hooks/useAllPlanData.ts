import { useState, useEffect } from 'react';
import { loadPlanStateFromServer } from '../services/api';
import type { CapacityPlanRow } from '../services/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

export function useAllPlanData() {
  const [data, setData] = useState<CapacityPlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/projects`);
        const projects = await res.json();
        const results = await Promise.all(
          projects.map((p: { id: number }) =>
            loadPlanStateFromServer(p.id).catch(() => null)
          )
        );
        const allRows: CapacityPlanRow[] = [];
        for (const state of results) {
          if (state?.plan) allRows.push(...state.plan);
        }
        setData(allRows);
      } catch { /* skip */ }
      setIsLoading(false);
    }
    load();
  }, []);

  return { data, isLoading };
}
