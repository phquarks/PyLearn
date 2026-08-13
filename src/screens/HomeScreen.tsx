import { EmptyState } from '../components/EmptyState';

export function HomeScreen() {
  return (
    <section className="page">
      <div className="page-header">
        <p className="eyebrow">Лента проектов</p>
        <h1>Портфолио разработчиков</h1>
        <p>
          Здесь появится список проектов всех пользователей с обложками, авторами, стеком и
          лайками.
        </p>
      </div>

      <EmptyState title="Проекты пока не загружены" description="Ленту подключим на шаге 4." />
    </section>
  );
}
