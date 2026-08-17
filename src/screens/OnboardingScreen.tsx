import { EmptyState } from '../components/EmptyState';

export function OnboardingScreen() {
  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">Profile</p>
        <h1>Create your profile</h1>
        <p>Username, avatar and bio arrive in step 3.</p>
      </div>

      <EmptyState title="Onboarding is not wired up yet" />
    </section>
  );
}
