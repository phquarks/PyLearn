import { supabase } from './supabase';

/**
 * The admin tools.
 *
 * Nothing here decides anything. `isAdmin` asks the database whether this
 * account is on the admin list, and the answer only controls whether a button
 * is drawn; `grantGems` is refused by the database itself for anybody else. If
 * this file were deleted the rule would still hold — that is the point.
 */

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');

  // an unmigrated database has no such function; treat that as "not an admin"
  // rather than surfacing an error on every profile screen
  if (error) {
    return false;
  }

  return data === true;
}

export type GrantResult = { email: string; gems: number };

export async function grantGems(email: string, amount: number): Promise<GrantResult> {
  const { data, error } = await supabase.rpc('admin_grant_gems', {
    target_email: email.trim(),
    amount,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error('The grant went through but returned nothing.');
  }

  return row as GrantResult;
}
