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
  profile_hidden: boolean;
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
const SHOP_COLUMNS =
  'gems, owned_items, snake_skin, snake_hat, snake_trail, avatar_url, profile_hidden';

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
  profile_hidden: false,
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
  /* xp, gems, streak, completed_lessons and owned_items are decided by the
     server now. A trigger discards them on the way in, so sending them would be
     noise that reads like a claim the client no longer gets to make. */
  const { xp, gems, streak, hearts, completed_lessons, owned_items, ...owned } = progress;
  const row = { ...owned, updated_at: new Date().toISOString() };
  const write = (payload: object) =>
    supabase.from('learning_profiles').upsert(payload, { onConflict: 'user_id' });

  const { error } = await write(row);

  if (!error) return;

  if (isMissingColumn(error)) {
    /* Rather than losing the whole save over the shop fields, drop them and
       write the rest. Gems bought on this device stay on this device until the
       migration lands, which beats XP and lessons silently failing to save. */
    const { snake_skin, snake_hat, snake_trail, avatar_url, profile_hidden, ...core } = row;
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

export type AwardResult = {
  xp: number;
  gems: number;
  streak: number;
  completed_lessons: number[];
  /** what this run alone was worth, so the result screen shows the real figure */
  awarded_xp: number;
  awarded_gems: number;
};

/**
 * Reports a finished lesson and gets the new totals back.
 *
 * The reward is worked out on the server; what the app computed locally is only
 * ever a preview. The day is sent from here because the boundary follows the
 * learner's clock, not the server's.
 */
export async function completeLesson(
  lessonId: number,
  correct: number,
  total: number,
): Promise<AwardResult> {
  const { data, error } = await supabase.rpc('complete_lesson', {
    lesson_id: lessonId,
    correct,
    total,
    local_day: today(),
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The lesson was recorded but returned no totals.');

  return row as AwardResult;
}

export type HeartState = { hearts: number; next_at: string | null };

/** Current hearts, with anything owed by the timer already credited. */
export async function heartState(): Promise<HeartState> {
  const { data, error } = await supabase.rpc('heart_state');

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Could not read your hearts.');

  return row as HeartState;
}

export async function loseHeart(): Promise<HeartState> {
  const { data, error } = await supabase.rpc('lose_heart');

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Could not record that answer.');

  return row as HeartState;
}

export type PurchaseResult = { gems: number; owned_items: string[] };

export async function purchaseItem(itemId: string): Promise<PurchaseResult> {
  const { data, error } = await supabase.rpc('purchase_item', { item_id: itemId });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The purchase returned nothing.');

  return row as PurchaseResult;
}

export async function buyHearts(): Promise<{ gems: number; hearts: number }> {
  const { data, error } = await supabase.rpc('buy_hearts');

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The refill returned nothing.');

  return row as { gems: number; hearts: number };
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


export async function getLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('user_id, name, xp, streak, avatar_url')
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
