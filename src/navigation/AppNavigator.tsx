import { useMutation } from '@tanstack/react-query';
import { NavLink, Route, Routes } from 'react-router-dom';

import { signOut } from '../api/auth';
import { LoadingState } from '../components/LoadingState';
import { AuthScreen } from '../screens/AuthScreen';
import { EditProjectScreen } from '../screens/EditProjectScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MyProfileScreen } from '../screens/MyProfileScreen';
import { NotFoundScreen } from '../screens/NotFoundScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ProjectDetailsScreen } from '../screens/ProjectDetailsScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { useAuthStore } from '../store/authStore';
import { routes } from './routes';

export function AppNavigator() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const session = useAuthStore((state) => state.session);
  const signOutMutation = useMutation({
    mutationFn: signOut,
  });

  if (!isInitialized) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <LoadingState label="Checking your session..." />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand-link" to={routes.home}>
          PyLearn
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to={routes.home}>Feed</NavLink>
          <NavLink to={routes.profile}>My profile</NavLink>
          {session ? (
            <button
              className="nav-button"
              disabled={signOutMutation.isPending}
              type="button"
              onClick={() => signOutMutation.mutate()}
            >
              {signOutMutation.isPending ? 'Logging out...' : 'Log out'}
            </button>
          ) : (
            <NavLink to={routes.signIn}>Log in</NavLink>
          )}
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route element={<HomeScreen />} path={routes.home} />
          <Route element={<AuthScreen />} path={routes.signIn} />
          <Route element={<ResetPasswordScreen />} path={routes.resetPassword} />
          <Route element={<OnboardingScreen />} path={routes.onboarding} />
          <Route element={<ProjectDetailsScreen />} path={routes.project} />
          <Route element={<MyProfileScreen />} path={routes.profile} />
          <Route element={<EditProjectScreen mode="create" />} path={routes.newProject} />
          <Route element={<EditProjectScreen mode="edit" />} path={routes.editProject} />
          <Route element={<NotFoundScreen />} path="*" />
        </Routes>
      </main>
    </div>
  );
}
