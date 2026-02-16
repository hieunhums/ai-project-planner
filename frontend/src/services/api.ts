/**
 * API client for AI Planning Assistant backend
 * Uses axios for HTTP requests with TanStack Query integration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Plan,
  PlanCreateRequest,
  PlanUploadResponse,
  HealthCheckResponse,
  ErrorResponse,
  PlanComparison,
  RecommendationDecisionResponse,
  ProjectSummary,
  ProjectDetail,
  ProjectCreateRequest,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
