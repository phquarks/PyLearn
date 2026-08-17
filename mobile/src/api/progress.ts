import { supabase } from './supabase';

/** Mirrors the `learning_profiles` table; the schema is shared with the web build. */
export type LearningProgress = {
  user_id: string;
  display_name: string | null;
  goal: string | null;
  experience: string | null;
  language: string;
  xp: number;
  streak: number;
  hearts: number;
  completed_lessons: number[];
  gems: number;
  owned_items: string[];
  snake_skin: string;
  snake_hat: string;
  snake_trail: string;
  avatar_url: string | null;
  started_at?: string;
  updated_at?: string;
};

export type LeaderboardRow = {
  user_id: string;
  name: string;
  xp: number;
  streak: number;
  avatar_url: string | null;
};
export type ActivityDay = { day: string; xp: number; lessons: number };

const CORE_COLUMNS =
  'user_id, display_name, goal, experience, language, xp, streak, hearts, completed_lessons, started_at, updated_at';

/** added by the gems migration; kept separate so their absence can be detected */
const SHOP_COLUMNS = 'gems, owned_items, snake_skin, snake_hat, snake_trail, avatar_url';

/**
 * Postgres and PostgREST both complain about an unknown column, with different
 * codes. Recognising either is what lets the app keep working against a
 * database where the newest migration has not been run yet.
 */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;

  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .* does not exist|could not find the .* column/i.test(error.message ?? '')
  );
}

const SHOP_DEFAULTS = {
  gems: 0,
  owned_items: [] as string[],
  snake_skin: 'green',
  snake_hat: 'none',
  snake_trail: 'plain',
  avatar_url: null as string | null,
};

export async function getLearningProgress(userId: string): Promise<LearningProgress | null> {
  const read = (columns: string) =>
    supabase.from('learning_profiles').select(columns).eq('user_id', userId).maybeSingle();

  let { data, error } = await read(`${CORE_COLUMNS}, ${SHOP_COLUMNS}`);

  if (isMissingColumn(error)) {
    // the shop migration has not been run; the rest of the profile still loads
    ({ data, error } = await read(CORE_COLUMNS));

    if (!error && data) {
      return { ...SHOP_DEFAULTS, ...(data as object) } as LearningProgress;
    }
  }

  if (error) {
    throw error;
  }

  return data as LearningProgress | null;
}

export async function upsertLearningProgress(progress: LearningProgress): Promise<void> {
  const row = { ...progress, updated_at: new Date().toISOString() };
  const write = (payload: object) =>
    supabase.from('learning_profiles').upsert(payload, { onConflict: 'user_id' });

  const { error } = await write(row);

  if (!error) return;

  if (isMissingColumn(error)) {
    /* Rather than losing the whole save over the shop fields, drop them and
       write the rest. Gems bought on this device stay on this device until the
       migration lands, which beats XP and lessons silently failing to save. */
    const { gems, owned_items, snake_skin, snake_hat, snake_trail, avatar_url, ...core } = row;
    const retry = await write(core);

    if (retry.error) {
      throw retry.error;
    }

    throw new Error(
      'Progress saved, but the shop needs the gems migration run in Supabase before purchases can sync.',
    );
  }

  throw error;
}

/**
 * Just the gem balance as the server currently has it.
 *
 * The app pushes its whole profile on a debounce, so a balance changed from
 * elsewhere — an admin grant — would be overwritten by the learner's next save.
 * Re-reading this one number is what lets a grant land on a phone that is
 * already open.
 */
export async function getGems(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('learning_profiles')
    .select('gems')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return (data as { gems: number }).gems;
}

/** Local calendar date as YYYY-MM-DD; the day boundary follows the learner's clock. */
export function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
}

export function dayBefore(iso: string, back: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() - back);

  return date.toISOString().slice(0, 10);
}

/** Adds a finished lesson to today's tally, creating the row on first use. */
export async function recordActivity(userId: string, xp: number, lessons = 1): Promise<void> {
  const day = today();
  const { data, error: readError } = await supabase
    .from('daily_activity')
    .select('xp, lessons')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const { error } = await supabase.from('daily_activity').upsert(
    {
      user_id: userId,
      day,
      xp: (data?.xp ?? 0) + xp,
      lessons: (data?.lessons ?? 0) + lessons,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,day' },
  );

  if (error) {
    throw error;
  }
}

export async function getActivity(userId: string, days = 30): Promise<ActivityDay[]> {
  const { data, error } = await supabase
    .from('daily_activity')
    .select('day, xp, lessons')
    .eq('user_id', userId)
    .gte('day', dayBefore(today(), days))
    .order('day', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ActivityDay[];
}

/**
 * Consecutive days of activity ending today, or ending yesterday when today is
 * still untouched — otherwise a streak would appear broken every morning until
 * the first lesson lands.
 */
export function streakFrom(activity: ActivityDay[]): number {
  const active = new Set(activity.filter((row) => row.lessons > 0 || row.xp > 0).map((row) => row.day));

  if (active.size === 0) {
    return 0;
  }

  const start = active.has(today()) ? 0 : active.has(dayBefore(today(), 1)) ? 1 : -1;

  if (start < 0) {
    return 0;
  }

  let streak = 0;

  for (let back = start; ; back += 1) {
    if (!active.has(dayBefore(today(), back))) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('user_id, name, xp, streak')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as LeaderboardRow[];
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'Cannot reach Supabase. Check EXPO_PUBLIC_SUPABASE_URL in mobile/.env.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Please try again.';
}
