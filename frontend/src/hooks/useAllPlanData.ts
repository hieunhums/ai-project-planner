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
        const allRows: CapacityPlanRow[] = [];
        for (const p of projects) {
          try {
            const state = await loadPlanStateFromServer(p.id);
            if (state.plan) allRows.push(...state.plan);
          } catch { /* skip */ }
        }
        setData(allRows);
      } catch { /* skip */ }
      setIsLoading(false);
    }
    load();
  }, []);

  return { data, isLoading };
}
