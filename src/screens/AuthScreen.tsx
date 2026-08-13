import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { signInWithEmail, signUpWithEmail } from '../api/auth';
import { routes } from '../navigation/routes';
import type { FormMode } from '../types/forms';
import { getErrorMessage } from '../utils/errorMessage';
import { authFormSchema, type AuthFormValues } from './authSchemas';

export function AuthScreen() {
  const [formMode, setFormMode] = useState<FormMode>('signIn');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<AuthFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(authFormSchema),
  });

  const authMutation = useMutation({
    mutationFn: async (values: AuthFormValues) => {
      if (formMode === 'signIn') {
        return signInWithEmail(values);
      }

      return signUpWithEmail({
        ...values,
        redirectTo: `${window.location.origin}${routes.onboarding}`,
      });
    },
    onError: () => {
      setSuccessMessage(null);
    },
    onSuccess: (session) => {
      setSuccessMessage(
        formMode === 'signIn'
          ? 'Вы вошли в аккаунт.'
          : session
            ? 'Аккаунт создан. Можно переходить к профилю.'
            : 'Проверьте почту и подтвердите регистрацию.',
      );
    },
  });

  const submitLabel = formMode === 'signIn' ? 'Войти' : 'Создать аккаунт';
  const errorMessage = authMutation.isError ? getErrorMessage(authMutation.error) : null;

  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">Аккаунт</p>
        <h1>Вход и регистрация</h1>
        <p>Используйте email и пароль для входа или создания нового профиля.</p>
      </div>

      <div className="form-card">
        <div className="segmented-control" aria-label="Режим формы">
          <button
            className={formMode === 'signIn' ? 'active' : ''}
            type="button"
            onClick={() => {
              setFormMode('signIn');
              authMutation.reset();
              setSuccessMessage(null);
            }}
          >
            Вход
          </button>
          <button
            className={formMode === 'signUp' ? 'active' : ''}
            type="button"
            onClick={() => {
              setFormMode('signUp');
              authMutation.reset();
              setSuccessMessage(null);
            }}
          >
            Регистрация
          </button>
        </div>

        <form
          className="form-stack"
          onSubmit={(event) => {
            void handleSubmit((values) => authMutation.mutate(values))(event);
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

          <label className="field">
            <span>Пароль</span>
            <input
              autoComplete={formMode === 'signIn' ? 'current-password' : 'new-password'}
              placeholder="Минимум 6 символов"
              type="password"
              {...register('password')}
            />
            {errors.password ? <small>{errors.password.message}</small> : null}
          </label>

          {errorMessage ? (
            <div className="inline-alert inline-alert-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="inline-alert inline-alert-success" role="status">
              {successMessage}
            </div>
          ) : null}

          <button className="primary-button full-width-button" disabled={authMutation.isPending}>
            {authMutation.isPending ? 'Отправка...' : submitLabel}
          </button>
        </form>
      </div>

      <Link className="text-link" to={routes.resetPassword}>
        Восстановить пароль
      </Link>
    </section>
  );
}
