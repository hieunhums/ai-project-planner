export const ROUTES = {
  login: '/login',
  projects: '/projects',
  projectDetail: '/projects/:projectId',
  compare: '/compare',
  iterate: '/iterate',
} as const;

export const buildProjectPath = (projectId: number) => `${ROUTES.projects}/${projectId}`;
