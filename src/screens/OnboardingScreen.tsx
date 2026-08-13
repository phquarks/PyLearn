import { EmptyState } from '../components/EmptyState';

export function OnboardingScreen() {
  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">Профиль</p>
        <h1>Создание профиля</h1>
        <p>Username, avatar и bio появятся на шаге 3.</p>
      </div>

      <EmptyState title="Онбординг еще не подключен" />
    </section>
  );
}
