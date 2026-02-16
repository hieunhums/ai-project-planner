/**
 * TypeScript interfaces for AI Planning Assistant
 * Matches backend Pydantic schemas
 */

export type PlanLineageType = 'ai_generated' | 'human_created' | 'hybrid';
export type PlanStatus = 'uploaded' | 'parsing' | 'generating' | 'completed' | 'failed';
export type RecommendationStatus = 'pending' | 'accepted' | 'rejected';

export interface Task {
  task_id: string;
  name: string;
  duration_days: number;
  start_date?: string;
  end_date?: string;
  resource_requirements?: Record<string, any>;
  dependencies?: string[];
  constraints?: Record<string, any>;
  priority?: string;
  cost?: number;
  lineage: PlanLineageType;
}

export interface Resource {
  resource_id: string;
  name: string;
  type: string; // Equipment, Personnel, Facility
  capacity?: number;
  availability_start?: string;
  availability_end?: string;
  hourly_cost?: number;
  skills?: string[];
}

export interface Assumption {
  assumption_type: string;
  description: string;
  value?: string;
}

export interface Recommendation {
  recommendation_type: string;
  affected_entities: Record<string, any>;
  rationale: string;
  impact_metrics?: Record<string, any>;
  status: RecommendationStatus;
}

export interface Plan {
  id?: number;
  name: string;
  description?: string;
  status: PlanStatus;
  lineage: PlanLineageType;
  total_duration_days?: number;
  capacity_utilization?: number;
  total_cost?: number;
  created_at?: string;
  updated_at?: string;
  tasks: Task[];
  resources: Resource[];
  assumptions: Assumption[];
  recommendations: Recommendation[];
}

export interface PlanCreateRequest {
  name: string;
  description?: string;
}

export interface PlanUploadResponse {
  plan_id: number;
  name: string;
  status: PlanStatus;
  tasks_count: number;
  resources_count: number;
  message: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
  timestamp: string;
}

export interface SuccessResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface HealthCheckResponse {
  status: string;
  database: string;
  ai_service: string;
  timestamp: string;
}
