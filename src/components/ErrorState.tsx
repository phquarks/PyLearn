type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({ title = 'Что-то пошло не так', message }: ErrorStateProps) {
  return (
    <section className="state-panel state-panel-error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
