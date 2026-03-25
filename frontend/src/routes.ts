export const ROUTES = {
  login: '/login',
  projects: '/projects',
  projectDetail: '/projects/:projectId',
  gantt: '/projects/:projectId/gantt',
  projectProposal: '/projects/:projectId/proposal',
  yardOverview: '/yard-overview',
  compare: '/compare',
  iterate: '/iterate',
} as const;

export const buildProjectPath = (projectId: number) => `${ROUTES.projects}/${projectId}`;
export const buildGanttPath = (projectId: number) => `${ROUTES.projects}/${projectId}/gantt`;
export const buildProposalPath = (projectId: number) => `${ROUTES.projects}/${projectId}/proposal`;
