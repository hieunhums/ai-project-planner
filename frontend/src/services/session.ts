export type Persona = 'planner' | 'admin';

const PERSONA_KEY = 'demoPersona';

export const setPersona = (persona: Persona) => {
  localStorage.setItem(PERSONA_KEY, persona);
};

export const getPersona = (): Persona | null => {
  const value = localStorage.getItem(PERSONA_KEY);
  if (value === 'planner' || value === 'admin') {
    return value;
  }
  return null;
};

export const clearPersona = () => {
  localStorage.removeItem(PERSONA_KEY);
};

// ---------------------------------------------------------------------------
// Sprint 002: Enquiry-to-Proposal — sessionStorage plan state
// All keys are scoped by projectId so multiple browser tabs don't interfere.
// sessionStorage is used (not localStorage) so data clears on tab close.
// ---------------------------------------------------------------------------

import type { CapacityPlanRow, YardAvailabilityRow } from './types';

// ---- Key builders -----------------------------------------------------------
const planKey = (projectId: number) => `plan_state_${projectId}`;
const rationaleKey = (projectId: number) => `plan_rationale_${projectId}`;
const undoKey = (projectId: number) => `plan_undo_${projectId}`;
const availabilityKey = (projectId: number) => `availability_state_${projectId}`;
const humanPlanKey = (projectId: number) => `human_plan_state_${projectId}`;

// ---- Capacity plan state ----------------------------------------------------

export function savePlanState(
  projectId: number,
  plan: CapacityPlanRow[],
  rationale: string
): void {
  sessionStorage.setItem(planKey(projectId), JSON.stringify(plan));
  sessionStorage.setItem(rationaleKey(projectId), rationale);
}

export function loadPlanState(
  projectId: number
): { plan: CapacityPlanRow[]; rationale: string } | null {
  const raw = sessionStorage.getItem(planKey(projectId));
  const rationale = sessionStorage.getItem(rationaleKey(projectId));
  if (!raw || rationale === null) return null;
  try {
    return { plan: JSON.parse(raw) as CapacityPlanRow[], rationale };
  } catch {
    return null;
  }
}

/**
 * Clear capacity plan state AND undo state AND availability state.
 * Calling this before a re-run ensures no stale downstream state survives.
 */
export function clearPlanState(projectId: number): void {
  sessionStorage.removeItem(planKey(projectId));
  sessionStorage.removeItem(rationaleKey(projectId));
  clearUndoState(projectId);
  clearAvailabilityState(projectId);
}

// ---- Undo state -------------------------------------------------------------

export function saveUndoState(projectId: number, previousPlan: CapacityPlanRow[]): void {
  sessionStorage.setItem(undoKey(projectId), JSON.stringify(previousPlan));
}

export function loadUndoState(projectId: number): CapacityPlanRow[] | null {
  const raw = sessionStorage.getItem(undoKey(projectId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CapacityPlanRow[];
  } catch {
    return null;
  }
}

export function clearUndoState(projectId: number): void {
  sessionStorage.removeItem(undoKey(projectId));
}

// ---- Availability state (FR-010a: cleared on re-run) -----------------------

export function saveAvailabilityState(projectId: number, yards: YardAvailabilityRow[]): void {
  sessionStorage.setItem(availabilityKey(projectId), JSON.stringify(yards));
}

export function loadAvailabilityState(projectId: number): YardAvailabilityRow[] | null {
  const raw = sessionStorage.getItem(availabilityKey(projectId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as YardAvailabilityRow[];
  } catch {
    return null;
  }
}

export function clearAvailabilityState(projectId: number): void {
  sessionStorage.removeItem(availabilityKey(projectId));
}

// ---- Human plan state (baseline overlay for GanttPage) ---------------------

export function saveHumanPlanState(projectId: number, rows: CapacityPlanRow[]): void {
  sessionStorage.setItem(humanPlanKey(projectId), JSON.stringify(rows));
}

export function loadHumanPlanState(projectId: number): CapacityPlanRow[] | null {
  const raw = sessionStorage.getItem(humanPlanKey(projectId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CapacityPlanRow[];
  } catch {
    return null;
  }
}

export function clearHumanPlanState(projectId: number): void {
  sessionStorage.removeItem(humanPlanKey(projectId));
}
