import { Link } from 'react-router-dom';

import { routes } from '../navigation/routes';

export function NotFoundScreen() {
  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">404</p>
        <h1>Страница не найдена</h1>
        <p>Похоже, такого маршрута в приложении нет.</p>
      </div>

      <Link className="primary-button" to={routes.home}>
        Вернуться в ленту
      </Link>
    </section>
  );
}
