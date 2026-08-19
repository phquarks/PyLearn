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
  blocked_at: string | null;
  blocked_reason: string | null;
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
  'gems, owned_items, snake_skin, snake_hat, snake_trail, avatar_url, profile_hidden, blocked_at, blocked_reason';

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
  blocked_at: null as string | null,
  blocked_reason: null as string | null,
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

/** the fields a client is allowed to own; everything else is the server's */
export type ProfilePatch = Partial<
  Pick<
    LearningProgress,
    'display_name' | 'goal' | 'experience' | 'language' | 'snake_skin' | 'snake_hat' | 'snake_trail' | 'avatar_url'
  >
>;

/**
 * Writes only what changed.
 *
 * Sending the whole row made the last writer win: open the app on a second
 * device and it would post its stale copy over everything the first one had
 * just changed. A patch touches nothing it was not asked to.
 */
export async function patchLearningProgress(userId: string, patch: ProfilePatch): Promise<void> {
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from('learning_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
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
    const { snake_skin, snake_hat, snake_trail, avatar_url, profile_hidden, blocked_at, blocked_reason, ...core } = row;
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

/**
 * A calendar date as YYYY-MM-DD, written out by hand.
 *
 * `toISOString` converts to UTC first, so anywhere east of Greenwich local
 * midnight lands on the previous day and every date comes back one short. That
 * is what put the whole progress chart a day behind: Wednesday's column was
 * labelled Tuesday, and today's lesson appeared to land yesterday.
 */
function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Local calendar date; the day boundary follows the learner's own clock. */
export function today(): string {
  return isoDate(new Date());
}

export function dayBefore(iso: string, back: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() - back);

  return isoDate(date);
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
  day: string = today(),
): Promise<AwardResult> {
  const { data, error } = await supabase.rpc('complete_lesson', {
    lesson_id: lessonId,
    correct,
    total,
    local_day: day,
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

/**
 * The prices the shop will actually charge.
 *
 * The catalogue in the app carries a price too, but only as a fallback for the
 * first render and for being offline: the database is what takes the gems, so
 * it is the one that decides. Showing one number and charging another is the
 * failure this removes.
 */
export async function getShopPrices(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('shop_items').select('id, price');

  if (error || !data) return {};

  return Object.fromEntries((data as { id: string; price: number }[]).map((row) => [row.id, row.price]));
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

/**
 * A message a person can act on.
 *
 * Supabase throws plain objects, not Error instances — a PostgrestError is
 * `{ message, details, hint, code }` and nothing more. An `instanceof Error`
 * check therefore misses every database error there is, which is how a real
 * explanation ("Not enough gems", "No account with that email") was being
 * replaced by a shrug.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'No connection. This will sync once you are back online.';
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const shape = error as { message?: unknown; hint?: unknown; details?: unknown; code?: unknown };
    const message = typeof shape.message === 'string' ? shape.message.trim() : '';
    // the hint is where Postgres puts the useful half of a constraint failure
    const hint = typeof shape.hint === 'string' ? shape.hint.trim() : '';

    if (message) {
      return hint && hint !== message ? `${message} (${hint})` : message;
    }

    const details = typeof shape.details === 'string' ? shape.details.trim() : '';
    if (details) return details;

    if (shape.code) return `Something went wrong (${String(shape.code)}).`;
  }

  return 'Something went wrong. Please try again.';
}
