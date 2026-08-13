export const routes = {
  home: '/',
  signIn: '/sign-in',
  resetPassword: '/reset-password',
  onboarding: '/onboarding',
  project: '/projects/:projectId',
  profile: '/me',
  newProject: '/projects/new',
  editProject: '/projects/:projectId/edit',
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
