import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './supabase';

export type AuthCredentials = {
  email: string;
  password: string;
};

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env.');
  }
}

export async function signInWithEmail({ email, password }: AuthCredentials): Promise<Session | null> {
  assertConfigured();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data.session;
}

/**
 * The name is written to the auth user's metadata as well as being held in app
 * state. When a project has email confirmation switched on, sign-up returns no
 * session and the app is closed long before the profile row is ever written —
 * metadata is what carries the name across to that first real login.
 */
export async function signUpWithEmail({
  email,
  password,
  name,
}: AuthCredentials & { name?: string }): Promise<Session | null> {
  assertConfigured();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name?.trim() || null } },
  });

  if (error) {
    throw error;
  }

  return data.session;
}

/**
 * Starts an email change. Supabase does not swap the address on the spot: it
 * sends a confirmation to the new one (and, depending on project settings, to
 * the old one too), and only a followed link completes the move. So a resolved
 * promise here means "check your inbox", not "done".
 */
export async function updateEmail(email: string): Promise<void> {
  assertConfigured();

  const { error } = await supabase.auth.updateUser({ email: email.trim() });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  assertConfigured();

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

export function subscribeToAuthChanges(listener: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(listener);

  return () => data.subscription.unsubscribe();
}
