import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './supabaseClient';

export type AuthCredentials = {
  email: string;
  password: string;
};

type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
  }
}

export async function signInWithEmail({ email, password }: AuthCredentials): Promise<Session | null> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signUpWithEmail({
  email,
  password,
  redirectTo,
}: AuthCredentials & { redirectTo: string }): Promise<Session | null> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function sendPasswordResetEmail({
  email,
  redirectTo,
}: {
  email: string;
  redirectTo: string;
}): Promise<void> {
  assertSupabaseConfigured();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  assertSupabaseConfigured();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function subscribeToAuthChanges(listener: AuthStateListener): () => void {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange(listener);

  return () => {
    data.subscription.unsubscribe();
  };
}
