import { Link } from 'react-router-dom';

import { routes } from '../navigation/routes';

export function NotFoundScreen() {
  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>There does not seem to be such a route in the app.</p>
      </div>

      <Link className="primary-button" to={routes.home}>
        Back to the feed
      </Link>
    </section>
  );
}
