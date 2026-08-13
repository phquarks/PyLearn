import { EmptyState } from '../components/EmptyState';

type EditProjectScreenProps = {
  mode: 'create' | 'edit';
};

export function EditProjectScreen({ mode }: EditProjectScreenProps) {
  const title = mode === 'create' ? 'Новый проект' : 'Редактирование проекта';

  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">Проекты</p>
        <h1>{title}</h1>
        <p>Форму с zod-валидацией добавим на шаге 7.</p>
      </div>

      <EmptyState title="Форма проекта еще не подключена" />
    </section>
  );
}
