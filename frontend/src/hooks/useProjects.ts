import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ProjectSummary } from '../services/types';

export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const result = await api.getProjects();
      setProjects(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (name: string) => {
    const payload = { name };
    const result = await api.createProject(payload);
    setProjects((prev) => [result, ...prev]);
    return result;
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    isLoading,
    error,
    createProject,
    refresh: fetchProjects,
  };
};
