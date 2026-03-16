import { useState, useCallback } from 'react';
import type { CapacityPlanRow, NLEditAction } from '../services/types';
import { parseNLCommand, updatePlan } from '../services/api';
import { saveUndoState, loadUndoState, clearUndoState, savePlanState, loadPlanState } from '../services/session';

export interface UseGanttEditReturn {
  plan: CapacityPlanRow[];
  canUndo: boolean;
  isLoading: boolean;
  error: string | null;
  applyNLEdit: (command: string) => Promise<void>;
  applyRowEdit: (planProjectId: string, newResource: string) => Promise<void>;
  applyDateShift: (planProjectId: string, deltaDays: number) => Promise<void>;
  undo: () => Promise<void>;
  clearError: () => void;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseISODate(d: string): Date {
  // Accepts "YYYY-MM-DD" or "dd-MM-yyyy" or "dd-MM-YYYY"
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  const [day, month, year] = d.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return formatDate(d);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGanttEdit(
  projectId: number,
  initialPlan: CapacityPlanRow[],
): UseGanttEditReturn {
  const [plan, setPlan] = useState<CapacityPlanRow[]>(initialPlan);
  const [undoPlan, setUndoPlan] = useState<CapacityPlanRow[] | null>(() =>
    loadUndoState(projectId),
  );
  // Preserve the existing rationale from session when re-saving after edits
  const rationaleRef = useState<string>(() => {
    const state = loadPlanState(projectId);
    return state?.rationale ?? '';
  })[0];
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUndo = undoPlan !== null;

  /** Persist plan to session + backend */
  const persist = useCallback(
    async (newPlan: CapacityPlanRow[], previousPlan: CapacityPlanRow[]) => {
      saveUndoState(projectId, previousPlan);
      savePlanState(projectId, newPlan, rationaleRef);
      await updatePlan(projectId, newPlan);
    },
    [projectId, rationaleRef],
  );

  /** Apply a structured NLEditAction to the current plan */
  const applyAction = useCallback(
    (action: NLEditAction, currentPlan: CapacityPlanRow[]): CapacityPlanRow[] => {
      return currentPlan.map((row) => {
        if (row.project_id !== action.project_id) return row;
        if (action.field === 'resource' && row.resource === action.from_value) {
          return { ...row, resource: action.to_value };
        }
        return row;
      });
    },
    [],
  );

  // ── applyNLEdit ──────────────────────────────────────────────────────────

  const applyNLEdit = useCallback(
    async (command: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const action = await parseNLCommand(projectId, command);
        const newPlan = applyAction(action, plan);
        await persist(newPlan, plan);
        setUndoPlan(plan);
        setPlan(newPlan);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply edit');
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, plan, applyAction, persist],
  );

  // ── applyRowEdit ─────────────────────────────────────────────────────────

  const applyRowEdit = useCallback(
    async (planProjectId: string, newResource: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const newPlan = plan.map((row) =>
          row.project_id === planProjectId ? { ...row, resource: newResource } : row,
        );
        await persist(newPlan, plan);
        setUndoPlan(plan);
        setPlan(newPlan);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply row edit');
      } finally {
        setIsLoading(false);
      }
    },
    [plan, persist],
  );

  // ── applyDateShift ───────────────────────────────────────────────────────

  const applyDateShift = useCallback(
    async (planProjectId: string, deltaDays: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const newPlan = plan.map((row) => {
          if (row.project_id !== planProjectId) return row;
          return {
            ...row,
            start_date: shiftDate(row.start_date, deltaDays),
            end_date:   shiftDate(row.end_date,   deltaDays),
          };
        });
        await persist(newPlan, plan);
        setUndoPlan(plan);
        setPlan(newPlan);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply date shift');
      } finally {
        setIsLoading(false);
      }
    },
    [plan, persist],
  );

  // ── undo ─────────────────────────────────────────────────────────────────

  const undo = useCallback(async () => {
    if (!undoPlan) return;
    setIsLoading(true);
    setError(null);
    try {
      savePlanState(projectId, undoPlan, rationaleRef);
      clearUndoState(projectId);
      await updatePlan(projectId, undoPlan);
      setPlan(undoPlan);
      setUndoPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Undo failed');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, undoPlan, rationaleRef]);

  const clearError = useCallback(() => setError(null), []);

  return { plan, canUndo, isLoading, error, applyNLEdit, applyRowEdit, applyDateShift, undo, clearError };
}
