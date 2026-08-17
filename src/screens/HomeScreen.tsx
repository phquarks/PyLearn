import { EmptyState } from '../components/EmptyState';

export function HomeScreen() {
  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">Project feed</p>
        <h1>Developer portfolios</h1>
        <p>
          This will list every user's projects with cover images, authors, tech stack and
          likes.
        </p>
      </div>

      <EmptyState title="No projects loaded yet" description="The feed gets wired up in step 4." />
    </section>
  );
}
