import { useRequiredRouteParam } from '../hooks/useRequiredRouteParam';

export function ProjectDetailsScreen() {
  const projectId = useRequiredRouteParam('projectId');

  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">Project</p>
        <h1>Project details</h1>
        <p>Gallery, links, likes and comments arrive in step 5.</p>
      </div>

      <div className="state-panel">
        <p>Project ID: {projectId}</p>
      </div>
    </section>
  );
}
