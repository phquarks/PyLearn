import { Link } from 'react-router-dom';

import { EmptyState } from '../components/EmptyState';
import { routes } from '../navigation/routes';

export function MyProfileScreen() {
  return (
    <section className="page">
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">Профиль</p>
          <h1>Мой профиль</h1>
          <p>Список своих проектов и редактирование профиля появятся на шаге 6.</p>
        </div>
        <Link className="primary-button" to={routes.newProject}>
          Добавить проект
        </Link>
      </div>

      <EmptyState title="Ваши проекты пока не загружены" />
    </section>
  );
}
