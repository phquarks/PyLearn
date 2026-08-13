import { useRequiredRouteParam } from '../hooks/useRequiredRouteParam';

export function ProjectDetailsScreen() {
  const projectId = useRequiredRouteParam('projectId');

  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">Проект</p>
        <h1>Детали проекта</h1>
        <p>Галерея, ссылки, лайки и комментарии появятся на шаге 5.</p>
      </div>

      <div className="state-panel">
        <p>ID проекта: {projectId}</p>
      </div>
    </section>
  );
}
