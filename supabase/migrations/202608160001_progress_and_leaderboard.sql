-- Real per-user progress: a public name for the leaderboard, a day-by-day
-- activity log for the progress chart, and a narrow view other learners may read.

-- 1. A name the leaderboard can show. Emails must never leave their owner's
--    account, so the board reads this column and never auth.users.
alter table public.learning_profiles
  add column if not exists display_name text;

-- 2. One row per learner per day. The weekly chart and the streak are both
--    derived from this, so neither can drift from what actually happened.
create table if not exists public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  xp integer not null default 0,
  lessons integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists daily_activity_user_day_idx
  on public.daily_activity (user_id, day desc);

alter table public.daily_activity enable row level security;

drop policy if exists "Users read own activity" on public.daily_activity;
create policy "Users read own activity"
on public.daily_activity
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users insert own activity" on public.daily_activity;
create policy "Users insert own activity"
on public.daily_activity
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own activity" on public.daily_activity;
create policy "Users update own activity"
on public.daily_activity
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 3. The leaderboard.
--
--    learning_profiles stays locked to its owner. This view is the single
--    deliberate opening, and it carries only what a board needs: a name, XP and
--    a streak. Goal, experience, hearts, lesson list and the user's email are
--    all left behind. security_invoker is off on purpose — the view runs as its
--    owner so it can see every row, which is exactly the hole being opened, and
--    the column list is what keeps that hole narrow.
drop view if exists public.leaderboard;
create view public.leaderboard
with (security_invoker = false)
as
select
  lp.user_id,
  coalesce(nullif(btrim(lp.display_name), ''), 'Learner') as name,
  lp.xp,
  lp.streak
from public.learning_profiles lp;

revoke all on public.leaderboard from anon;
grant select on public.leaderboard to authenticated;
