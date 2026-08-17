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
          ? 'You are now logged in.'
          : session
            ? 'Account created. You can head to your profile.'
            : 'Check your inbox and confirm the sign-up.',
      );
    },
  });

  const submitLabel = formMode === 'signIn' ? 'Log in' : 'Create account';
  const errorMessage = authMutation.isError ? getErrorMessage(authMutation.error) : null;

  return (
    <section className="page narrow-page">
      <div className="page-header">
        <p className="eyebrow">Account</p>
        <h1>Log in or sign up</h1>
        <p>Use your email and password to log in or create a new profile.</p>
      </div>

      <div className="form-card">
        <div className="segmented-control" aria-label="Form mode">
          <button
            className={formMode === 'signIn' ? 'active' : ''}
            type="button"
            onClick={() => {
              setFormMode('signIn');
              authMutation.reset();
              setSuccessMessage(null);
            }}
          >
            Log in
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
            Sign up
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
            <span>Password</span>
            <input
              autoComplete={formMode === 'signIn' ? 'current-password' : 'new-password'}
              placeholder="At least 6 characters"
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
            {authMutation.isPending ? 'Submitting...' : submitLabel}
          </button>
        </form>
      </div>

      <Link className="text-link" to={routes.resetPassword}>
        Reset your password
      </Link>
    </section>
  );
}
