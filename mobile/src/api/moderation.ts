import { supabase } from './supabase';

/**
 * Reporting a name or picture for an admin to review.
 *
 * A report asks an admin to look; it does not change the board on its own. The
 * learner is told that plainly rather than being left to wonder why the name is
 * still there.
 */

export async function reportProfile(target: string, reason: string): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  const reporter = session.user?.id;

  if (!reporter) {
    throw new Error('Sign in to report someone.');
  }

  const { error } = await supabase
    .from('profile_reports')
    .upsert({ reporter, target, reason }, { onConflict: 'reporter,target' });

  if (error) throw error;
}

export type OpenReport = {
  target: string;
  email: string;
  name: string;
  reports: number;
  last_reason: string;
};

export async function openReports(): Promise<OpenReport[]> {
  const { data, error } = await supabase.rpc('admin_open_reports');

  if (error) throw error;

  return (data ?? []) as OpenReport[];
}

export async function showProfile(email: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_show_profile', { target_email: email.trim() });

  if (error) throw error;

  return String(data ?? email);
}

export async function blockAccount(email: string, reason: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_block_account', {
    target_email: email.trim(),
    reason: reason.trim() || null,
  });

  if (error) throw error;

  return String(data ?? email);
}

export async function unblockAccount(email: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_unblock_account', {
    target_email: email.trim(),
  });

  if (error) throw error;

  return String(data ?? email);
}

export async function hideProfile(email: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_hide_profile', { target_email: email.trim() });

  if (error) throw error;

  return String(data ?? email);
}
