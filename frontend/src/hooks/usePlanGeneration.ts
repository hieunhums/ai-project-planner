import { useState } from 'react';

interface GeneratePlanOptions {
  planId: number;
}

interface GeneratePlanResult {
  aiPlanId: number;
  originalPlanId: number;
  name: string;
  status: string;
  metrics: {
    total_duration_days: number;
    capacity_utilization: number;
    total_cost: number;
    task_count: number;
    resource_count: number;
  };
  modelUsed: string;
  message: string;
}

export const usePlanGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async (
    options: GeneratePlanOptions
  ): Promise<GeneratePlanResult | null> => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress for long-running AI generation
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 3000); // Update every 3 seconds

      const response = await fetch(
        `http://localhost:8000/api/plans/${options.planId}/generate`,
        {
          method: 'POST',
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Plan generation failed');
      }

      const result = await response.json();

      // Check for infeasible plan
      if (result.status === 'infeasible') {
        setError(
          `Plan is infeasible. ${result.violations?.length || 0} constraint violations found.`
        );
        return null;
      }

      return {
        aiPlanId: result.plan_id,
        originalPlanId: result.original_plan_id,
        name: result.name,
        status: result.status,
        metrics: result.metrics,
        modelUsed: result.model_used,
        message: result.message,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setIsGenerating(false);
    setProgress(0);
    setError(null);
  };

  return {
    generatePlan,
    isGenerating,
    progress,
    error,
    reset,
  };
};
