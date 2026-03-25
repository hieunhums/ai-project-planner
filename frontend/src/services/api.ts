/**
 * API client for AI Planning Assistant backend
 * Uses axios for HTTP requests with TanStack Query integration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Plan,
  PlanUploadResponse,
  HealthCheckResponse,
  ErrorResponse,
  PlanComparison,
  RecommendationDecisionResponse,
  ProjectSummary,
  ProjectDetail,
  ProjectCreateRequest,
  YardAvailabilityRow,
  CapacityPlanResponse,
  NLEditAction,
  CapacityPlanRow,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes for plan generation
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        if (error.response) {
          // Server responded with error status
          const errorData = error.response.data;
          throw new Error(errorData?.error || 'An error occurred');
        } else if (error.request) {
          // Request made but no response
          throw new Error('No response from server. Please check your connection.');
        } else {
          // Request setup error
          throw new Error(error.message || 'Failed to make request');
        }
      }
    );
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.client.get<HealthCheckResponse>('/health');
    return response.data;
  }

  // Plan operations (to be implemented in Phase 3+)
  async uploadPlan(file: File, name: string): Promise<PlanUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    const response = await this.client.post<PlanUploadResponse>('/plans/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async generatePlan(planId: number): Promise<Plan> {
    const response = await this.client.post<Plan>(`/plans/${planId}/generate`);
    return response.data;
  }

  async getPlan(planId: number): Promise<Plan> {
    const response = await this.client.get<Plan>(`/plans/${planId}`);
    return response.data;
  }

  async getPlanDetails(planId: number): Promise<Plan> {
    const response = await this.client.get<Plan>(`/plans/${planId}/details`);
    return response.data;
  }

  async comparePlans(planId1: number, planId2: number): Promise<PlanComparison> {
    const response = await this.client.post<PlanComparison>(`/plans/compare`, {
      plan_id_1: planId1,
      plan_id_2: planId2,
    });
    return response.data;
  }

  async getProjects(): Promise<ProjectSummary[]> {
    const response = await this.client.get<ProjectSummary[]>(`/projects`);
    return response.data;
  }

  async createProject(request: ProjectCreateRequest): Promise<ProjectSummary> {
    const response = await this.client.post<ProjectSummary>(`/projects`, request);
    return response.data;
  }

  async getProjectDetail(projectId: number): Promise<ProjectDetail> {
    const response = await this.client.get<ProjectDetail>(`/projects/${projectId}`);
    return response.data;
  }

  async deleteProject(projectId: number): Promise<void> {
    await this.client.delete(`/projects/${projectId}`);
  }

  async updateConstraints(
    planId: number,
    constraints: Record<string, any>,
    regenerate = true
  ): Promise<Plan> {
    const response = await this.client.post<Plan>(`/plans/${planId}/constraints`, {
      constraints,
      regenerate,
    });
    return response.data;
  }

  async acceptRecommendation(
    planId: number,
    recommendationId: number,
    accept: boolean
  ): Promise<RecommendationDecisionResponse> {
    const response = await this.client.post(
      `/plans/${planId}/recommendations/${recommendationId}`,
      { accept }
    );
    return response.data;
  }

  async exportPlan(planId: number, format: 'csv' | 'gantt' | 'json'): Promise<Blob> {
    const response = await this.client.get(`/plans/${planId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export API functions for use with TanStack Query
export const api = {
  healthCheck: () => apiClient.healthCheck(),
  uploadPlan: (file: File, name: string) => apiClient.uploadPlan(file, name),
  generatePlan: (planId: number) => apiClient.generatePlan(planId),
  getPlan: (planId: number) => apiClient.getPlan(planId),
  getPlanDetails: (planId: number) => apiClient.getPlanDetails(planId),
  comparePlans: (planId1: number, planId2: number) => apiClient.comparePlans(planId1, planId2),
  getProjects: () => apiClient.getProjects(),
  createProject: (request: ProjectCreateRequest) => apiClient.createProject(request),
  getProjectDetail: (projectId: number) => apiClient.getProjectDetail(projectId),
  deleteProject: (projectId: number) => apiClient.deleteProject(projectId),
  updateConstraints: (planId: number, constraints: Record<string, any>, regenerate?: boolean) =>
    apiClient.updateConstraints(planId, constraints, regenerate),
  acceptRecommendation: (planId: number, recommendationId: number, accept: boolean) =>
    apiClient.acceptRecommendation(planId, recommendationId, accept),
  exportPlan: (planId: number, format: 'csv' | 'gantt' | 'json') =>
    apiClient.exportPlan(planId, format),
};

// ---------------------------------------------------------------------------
// Sprint 002: Enquiry-to-Proposal — standalone fetch functions
// Using native fetch + AbortController so we can apply per-call timeouts
// independently of the global axios client (30 s for stub endpoints).
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

/** Save project details form data (multipart/form-data with two CSV uploads) */
export interface SaveProjectDetailsResponse {
  id: number;
  name: string;
  project_type: string;
  warnings: string[];
}

export async function saveProjectDetails(
  projectId: number,
  formData: FormData
): Promise<SaveProjectDetailsResponse> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/details`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || `Failed to save project details (${response.status})`);
  }
  return response.json() as Promise<SaveProjectDetailsResponse>;
}

/** Fetch yard availability with a 30 s timeout (stub introduces 10–20 s delay) */
export async function fetchYardAvailability(projectId: number): Promise<YardAvailabilityRow[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${API_BASE}/projects/${projectId}/yard-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.detail || `Yard availability failed (${response.status})`);
    }
    const data = await response.json();
    return data.yards as YardAvailabilityRow[];
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Request timed out after 30s');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch capacity plan with a 30 s timeout (stub introduces 10–20 s delay) */
export async function fetchCapacityPlan(
  projectId: number,
  selectedYards: string[],
  prompt: string
): Promise<CapacityPlanResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${API_BASE}/projects/${projectId}/capacity-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_yards: selectedYards, prompt }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.detail || `Capacity plan failed (${response.status})`);
    }
    return (await response.json()) as CapacityPlanResponse;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Request timed out after 30s');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Parse a natural-language edit command (rule-based, no simulated delay) */
export async function parseNLCommand(projectId: number, command: string): Promise<NLEditAction> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/plan-edit/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || `NL parse failed (${response.status})`);
  }
  return (await response.json()) as NLEditAction;
}

/** Server-side plan state persistence */
export async function savePlanStateToServer(
  projectId: number,
  plan: CapacityPlanRow[] | null,
  humanPlan: CapacityPlanRow[] | null,
  rationale: string
): Promise<void> {
  // Only include non-null fields so we don't overwrite existing server data
  const body: Record<string, any> = {};
  if (plan !== null) body.plan = plan;
  if (humanPlan !== null) body.human_plan = humanPlan;
  if (rationale) body.rationale = rationale;

  await fetch(`${API_BASE}/projects/${projectId}/plan-state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export interface ServerPlanState {
  plan: CapacityPlanRow[] | null;
  human_plan: CapacityPlanRow[] | null;
  rationale: string | null;
}

export async function loadPlanStateFromServer(projectId: number): Promise<ServerPlanState> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/plan-state`);
  if (!response.ok) return { plan: null, human_plan: null, rationale: null };
  return (await response.json()) as ServerPlanState;
}

/** AI Replan — send current plan + changes to o3 for optimized replanning */
export interface ReplanRequest {
  plan_rows: CapacityPlanRow[];
  changes: Record<string, any>;
}

export interface ReplanReasoning {
  summary: string;
  per_task: Record<string, string>;
  tradeoffs: string[];
}

export interface ReplanResponse {
  changed_rows: CapacityPlanRow[];
  reasoning: ReplanReasoning;
  model: string;
  tokens_used: Record<string, number>;
}

export async function replanWithAI(
  projectId: number,
  planRows: CapacityPlanRow[],
  changes: Record<string, any>
): Promise<ReplanResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000); // 2 min for o3
  try {
    const response = await fetch(`${API_BASE}/projects/${projectId}/replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_rows: planRows, changes }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.detail || `Replan failed (${response.status})`);
    }
    return (await response.json()) as ReplanResponse;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Replan timed out after 2 minutes');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Stream replan response via SSE.
 * onToken(text) called for each token, onDone(result) when complete.
 */
export async function updateProjectFields(
  projectId: number,
  fields: Record<string, any>
): Promise<void> {
  await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

export async function replanWithAIStream(
  projectId: number,
  planRows: CapacityPlanRow[],
  changes: Record<string, any>,
  callbacks: {
    onToken: (text: string) => void;
    onDone: (data: { model: string; result: any }) => void;
    onError: (message: string) => void;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/replan/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_rows: planRows, changes }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || `Replan failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let eventType = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (eventType === 'token') callbacks.onToken(parsed.text);
          else if (eventType === 'done') callbacks.onDone(parsed);
          else if (eventType === 'error') callbacks.onError(parsed.message);
        } catch { /* skip malformed */ }
        eventType = '';
      }
    }
  }
}

/** Persist updated plan rows to the backend after NL or drag-drop edit */
export async function updatePlan(projectId: number, rows: CapacityPlanRow[]): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || `Plan update failed (${response.status})`);
  }
}

