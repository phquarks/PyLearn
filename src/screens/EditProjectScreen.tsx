import { EmptyState } from '../components/EmptyState';

type EditProjectScreenProps = {
  mode: 'create' | 'edit';
};

export function EditProjectScreen({ mode }: EditProjectScreenProps) {
  const title = mode === 'create' ? 'New project' : 'Edit project';

  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">Projects</p>
        <h1>{title}</h1>
        <p>The zod-validated form arrives in step 7.</p>
      </div>

      <EmptyState title="The project form is not wired up yet" />
    </section>
  );
}
