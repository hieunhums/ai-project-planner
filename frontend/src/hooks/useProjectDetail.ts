import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ProjectDetail } from '../services/types';

export const useProjectDetail = (projectId: number | null) => {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const result = await api.getProjectDetail(projectId);
      setProject(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetchProject();
  }, [fetchProject, projectId]);

  return {
    project,
    isLoading,
    error,
    refresh: fetchProject,
    setProject,
  };
};
