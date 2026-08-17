type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <section className="state-panel" aria-busy="true" aria-live="polite">
      <p>{label}</p>
    </section>
  );
}
