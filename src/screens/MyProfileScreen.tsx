import { Link } from 'react-router-dom';

import { EmptyState } from '../components/EmptyState';
import { routes } from '../navigation/routes';

export function MyProfileScreen() {
  return (
    <section className="page">
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>My profile</h1>
          <p>Your own project list and profile editing arrive in step 6.</p>
        </div>
        <Link className="primary-button" to={routes.newProject}>
          Add a project
        </Link>
      </div>

      <EmptyState title="Your projects have not loaded yet" />
    </section>
  );
}
