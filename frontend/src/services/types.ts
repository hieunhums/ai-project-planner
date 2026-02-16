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
  explanation?: string;
  assumptions?: string[];
  trade_offs?: string[];
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
  id?: number;
  recommendation_type: string;
  affected_entities: Record<string, any>;
  rationale: string;
  impact_metrics?: Record<string, any>;
  status: RecommendationStatus;
}

export interface Plan {
  id?: number;
  project_id?: number;
  base_plan_id?: number;
  name: string;
  description?: string;
  status: PlanStatus;
  lineage: PlanLineageType;
  total_duration_days?: number;
  capacity_utilization?: number;
  total_cost?: number;
  created_at?: string;
  updated_at?: string;
  source_file_name?: string;
  tasks: Task[];
  resources: Resource[];
  assumptions: Assumption[];
  recommendations: Recommendation[];
  source_file_path?: string;
  plan_data_json?: Record<string, any>;
}

export interface ProjectSummary {
  id: number;
  name: string;
  created_at?: string;
}

export interface UploadSummary {
  plan_id: number;
  file_name: string;
  uploaded_at?: string;
  status_label: string;
}

export interface GeneratedPlanSummary {
  plan_id: number;
  name: string;
  generated_at?: string;
  status_label: string;
}

export interface ProjectDetail {
  id: number;
  name: string;
  uploads: UploadSummary[];
  generated_plans: GeneratedPlanSummary[];
}

export interface ProjectCreateRequest {
  name: string;
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

export interface PlanComparisonChange {
  field: string;
  plan_1?: any;
  plan_2?: any;
}

export interface TaskDifference {
  task_id: string;
  name: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  changes: PlanComparisonChange[];
}

export interface PlanComparisonSummary {
  duration_delta_days: number;
  cost_delta: number;
  capacity_delta: number;
  task_count_delta: number;
  resource_count_delta: number;
  plan_a_metrics: Record<string, any>;
  plan_b_metrics: Record<string, any>;
}

export interface PlanComparison {
  plan_id_1?: number;
  plan_id_2?: number;
  summary: PlanComparisonSummary;
  task_differences: TaskDifference[];
  tradeoffs: string[];
  generated_at?: string;
}

export interface RecommendationDecisionResponse {
  plan_id: number;
  recommendation_id: number;
  status: RecommendationStatus;
  updated_task_ids: string[];
}
