-- Hearts that come back.
--
-- A wrong answer costs a heart, and until now nothing ever returned one except
-- paying gems. A beginner — who is wrong most often, and has no gems yet —
-- could run out on their first lesson and simply be unable to carry on. That is
-- not difficulty, it is a wall in the doorway.
--
-- Hearts now refill on a timer, and the timer is kept here rather than on the
-- phone: a clock the learner can change is not a clock you can charge against.

alter table public.learning_profiles
  -- when the current refill period started; null while hearts are full
  add column if not exists hearts_updated_at timestamptz;

/* One heart every half hour, five at most. Both numbers live in these two
   functions and nowhere else, so changing the pace is a one-line edit. */
create or replace function public.hearts_now(stored integer, since timestamptz)
returns integer
language sql
immutable
as $$
  select least(
    5,
    coalesce(stored, 5) + case
      when since is null then 0
      else floor(extract(epoch from (now() - since)) / (30 * 60))::integer
    end
  );
$$;

/*
 * The current hearts, and when the next one lands.
 *
 * Regeneration is worked out on read rather than by a scheduled job: there is
 * nothing to run, nothing to fall behind, and a learner who was away for a week
 * simply comes back full.
 */
create or replace function public.heart_state()
returns table (hearts integer, next_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  stored integer;
  since timestamptz;
  current_hearts integer;
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  select lp.hearts, lp.hearts_updated_at into stored, since
  from public.learning_profiles lp
  where lp.user_id = uid;

  if stored is null then
    raise exception 'Start the course first.';
  end if;

  current_hearts := public.hearts_now(stored, since);

  -- Bank whatever has accrued, so the elapsed time is not counted twice. Once
  -- full the timer is cleared; it starts again on the next heart lost.
  if current_hearts <> stored then
    perform set_config('pylearn.awarding', 'on', true);

    update public.learning_profiles lp
    set hearts = current_hearts,
        hearts_updated_at = case when current_hearts >= 5 then null else now() end,
        updated_at = now()
    where lp.user_id = uid;

    since := case when current_hearts >= 5 then null else now() end;
  end if;

  hearts := current_hearts;
  next_at := case when current_hearts >= 5 then null else since + interval '30 minutes' end;

  return next;
end;
$$;

/** Spends one heart on a wrong answer, after first crediting anything owed. */
create or replace function public.lose_heart()
returns table (hearts integer, next_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  stored integer;
  since timestamptz;
  current_hearts integer;
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  select lp.hearts, lp.hearts_updated_at into stored, since
  from public.learning_profiles lp
  where lp.user_id = uid;

  if stored is null then
    raise exception 'Start the course first.';
  end if;

  current_hearts := greatest(0, public.hearts_now(stored, since) - 1);

  perform set_config('pylearn.awarding', 'on', true);

  update public.learning_profiles lp
  set hearts = current_hearts,
      -- losing from full is what starts the clock; otherwise it keeps running
      hearts_updated_at = case
        when current_hearts >= 5 then null
        when since is null then now()
        else since
      end,
      updated_at = now()
  where lp.user_id = uid
  returning lp.hearts_updated_at into since;

  hearts := current_hearts;
  next_at := case when current_hearts >= 5 then null else since + interval '30 minutes' end;

  return next;
end;
$$;

-- The refill now also clears the timer, or the next loss would inherit a clock
-- that has been running since long before it.
create or replace function public.buy_hearts()
returns table (gems integer, hearts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cost constant integer := 60;
  balance integer;
  have integer;
  since timestamptz;
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  select lp.gems, lp.hearts, lp.hearts_updated_at into balance, have, since
  from public.learning_profiles lp
  where lp.user_id = uid;

  if balance is null then
    raise exception 'Start the course first.';
  end if;

  if public.hearts_now(have, since) >= 5 then
    raise exception 'Your hearts are already full.';
  end if;

  if balance < cost then
    raise exception 'Not enough gems.';
  end if;

  perform set_config('pylearn.awarding', 'on', true);

  update public.learning_profiles lp
  set gems = lp.gems - cost,
      hearts = 5,
      hearts_updated_at = null,
      updated_at = now()
  where lp.user_id = uid
  returning lp.gems, lp.hearts into gems, hearts;

  return next;
end;
$$;

/* Hearts join the columns the client may no longer set. Without this the timer
   is decoration: the app could simply write five back. */
create or replace function public.guard_earned_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('pylearn.awarding', true), 'off') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.xp := 0;
    new.gems := 0;
    new.streak := 0;
    new.hearts := 5;
    new.hearts_updated_at := null;
    new.completed_lessons := '{}';
    new.owned_items := '{}';

    return new;
  end if;

  new.xp := old.xp;
  new.gems := old.gems;
  new.streak := old.streak;
  new.hearts := old.hearts;
  new.hearts_updated_at := old.hearts_updated_at;
  new.completed_lessons := old.completed_lessons;
  new.owned_items := old.owned_items;

  return new;
end;
$$;

revoke all on function public.heart_state() from public, anon;
revoke all on function public.lose_heart() from public, anon;
grant execute on function public.heart_state() to authenticated;
grant execute on function public.lose_heart() to authenticated;
