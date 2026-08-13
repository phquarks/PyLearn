import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { sendPasswordResetEmail } from '../api/auth';
import { routes } from '../navigation/routes';
import { getErrorMessage } from '../utils/errorMessage';
import { resetPasswordSchema, type ResetPasswordValues } from './authSchemas';

export function ResetPasswordScreen() {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ResetPasswordValues>({
    defaultValues: {
      email: '',
    },
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetMutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      sendPasswordResetEmail({
        email: values.email,
        redirectTo: `${window.location.origin}${routes.signIn}`,
      }),
  });

  const errorMessage = resetMutation.isError ? getErrorMessage(resetMutation.error) : null;

  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">Безопасность</p>
        <h1>Восстановление пароля</h1>
        <p>Введите email, и Supabase отправит ссылку для восстановления доступа.</p>
      </div>

      <div className="form-card">
        <form
          className="form-stack"
          onSubmit={(event) => {
            void handleSubmit((values) => resetMutation.mutate(values))(event);
          }}
        >
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              type="email"
              {...register('email')}
            />
            {errors.email ? <small>{errors.email.message}</small> : null}
          </label>

          {errorMessage ? (
            <div className="inline-alert inline-alert-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {resetMutation.isSuccess ? (
            <div className="inline-alert inline-alert-success" role="status">
              Если email зарегистрирован, письмо для восстановления уже отправлено.
            </div>
          ) : null}

          <button className="primary-button full-width-button" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? 'Отправка...' : 'Отправить ссылку'}
          </button>
        </form>
      </div>

      <Link className="text-link" to={routes.signIn}>
        Вернуться ко входу
      </Link>
    </section>
  );
}
