-- Shop currency and what it buys.
--
-- Gems are earned by finishing lessons and spent on cosmetics, so they have to
-- survive a reinstall the same way XP does. Everything here hangs off the
-- existing learning_profiles row, which is already locked to its owner by RLS —
-- no new policies are needed, and nothing added here reaches the leaderboard
-- view, which still exposes only name, XP and streak.

alter table public.learning_profiles
  add column if not exists gems integer not null default 0,
  -- what has been bought: cosmetic ids, one row per learner
  add column if not exists owned_items text[] not null default '{}',
  -- what is currently worn; the defaults match the items every account starts with
  add column if not exists snake_skin text not null default 'green',
  add column if not exists snake_hat text not null default 'none',
  add column if not exists snake_trail text not null default 'plain';

-- Gems must never go negative. The app checks affordability before spending,
-- but a check constraint is what makes that true regardless of which client,
-- or which race between two devices, gets there first.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'learning_profiles_gems_not_negative'
  ) then
    alter table public.learning_profiles
      add constraint learning_profiles_gems_not_negative check (gems >= 0);
  end if;
end $$;
