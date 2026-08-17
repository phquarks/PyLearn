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
        <p className="eyebrow">Security</p>
        <h1>Reset your password</h1>
        <p>Enter your email and Supabase will send you a recovery link.</p>
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
              If that email is registered, the recovery message is already on its way.
            </div>
          ) : null}

          <button className="primary-button full-width-button" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? 'Sending...' : 'Send the link'}
          </button>
        </form>
      </div>

      <Link className="text-link" to={routes.signIn}>
        Back to log in
      </Link>
    </section>
  );
}
