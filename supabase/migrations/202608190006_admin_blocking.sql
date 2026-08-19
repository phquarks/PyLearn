-- Blocking an account, and only an admin may do it.
--
-- Hiding a name and picture answers a bad nickname. It does not answer somebody
-- who keeps coming back, so there has to be a way to stop an account entirely.
--
-- The block is enforced in these functions rather than by hiding a screen. A
-- screen the app declines to draw is a suggestion: the same public key still
-- reaches the API. What actually stops a blocked account is that every function
-- which grants or spends anything refuses to run for it.

alter table public.learning_profiles
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text;

/* Blocking joins the columns a client may never write. Without this the app
   could simply clear the flag on its next profile save. */
create or replace function public.guard_earned_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.profile_hidden then
    new.display_name := null;
    new.avatar_url := null;
    new.profile_hidden := old.profile_hidden;
  end if;

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
    new.profile_hidden := false;
    new.blocked_at := null;
    new.blocked_reason := null;

    return new;
  end if;

  new.xp := old.xp;
  new.gems := old.gems;
  new.streak := old.streak;
  new.hearts := old.hearts;
  new.hearts_updated_at := old.hearts_updated_at;
  new.completed_lessons := old.completed_lessons;
  new.owned_items := old.owned_items;
  new.profile_hidden := old.profile_hidden;
  new.blocked_at := old.blocked_at;
  new.blocked_reason := old.blocked_reason;

  return new;
end;
$$;

/** Raised by everything a blocked account must not be able to do. */
create or replace function public.refuse_if_blocked(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reason text;
  since timestamptz;
  message text;
begin
  select lp.blocked_reason, lp.blocked_at into reason, since
  from public.learning_profiles lp
  where lp.user_id = uid;

  if since is not null then
    -- built first: RAISE reads its arguments up to USING, and a multi-line
    -- CASE sitting in that list is what the parser choked on
    message := 'This account is blocked.';

    if reason is not null and btrim(reason) <> '' then
      message := message || ' ' || reason;
    end if;

    raise exception '%', message using errcode = '42501';
  end if;
end;
$$;

-- ------------------------------------------------------------ the admin side

create or replace function public.admin_block_account(target_email text, reason text default null)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  select u.id into target_id
  from auth.users u
  where lower(u.email) = lower(btrim(target_email));

  if target_id is null then
    raise exception 'No account is registered with that email.';
  end if;

  -- an admin locking out an admin, themselves included, is how a project loses
  -- its only way back in
  if exists (
    select 1 from public.admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = target_id
  ) then
    raise exception 'That account is an admin.';
  end if;

  perform set_config('pylearn.awarding', 'on', true);

  update public.learning_profiles
  set blocked_at = now(),
      blocked_reason = nullif(btrim(coalesce(reason, '')), ''),
      updated_at = now()
  where user_id = target_id;

  update public.profile_reports set handled = true where target = target_id;

  return btrim(target_email);
end;
$$;

create or replace function public.admin_unblock_account(target_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  select u.id into target_id
  from auth.users u
  where lower(u.email) = lower(btrim(target_email));

  if target_id is null then
    raise exception 'No account is registered with that email.';
  end if;

  perform set_config('pylearn.awarding', 'on', true);

  update public.learning_profiles
  set blocked_at = null, blocked_reason = null, updated_at = now()
  where user_id = target_id;

  return btrim(target_email);
end;
$$;

-- --------------------------------------------- where the block actually bites

create or replace function public.complete_lesson(
  lesson_id integer,
  correct integer,
  total integer,
  local_day date
)
returns table (xp integer, gems integer, streak integer, completed_lessons integer[], awarded_xp integer, awarded_gems integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  repeat_run boolean;
  award_xp integer;
  award_gems integer;
  day_used date;
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  perform public.refuse_if_blocked(uid);

  if total is null or total < 1 or total > 12 then
    raise exception 'That is not a lesson length.';
  end if;

  if correct is null or correct < 0 or correct > total then
    raise exception 'That score is not possible.';
  end if;

  if lesson_id is null or lesson_id < 1 or lesson_id > 500 then
    raise exception 'No such lesson.';
  end if;

  day_used := least(greatest(coalesce(local_day, current_date), current_date - 1), current_date + 1);

  perform set_config('pylearn.awarding', 'on', true);

  select lesson_id = any(coalesce(lp.completed_lessons, '{}'))
    into repeat_run
  from public.learning_profiles lp
  where lp.user_id = uid;

  if repeat_run is null then
    raise exception 'Start the course before finishing a lesson.';
  end if;

  award_xp := 10 + correct * 5;
  award_gems := 15;

  if repeat_run then
    award_xp := greatest(1, award_xp / 3);
    award_gems := 0;
  end if;

  insert into public.daily_activity (user_id, day, xp, lessons)
  values (uid, day_used, award_xp, 1)
  on conflict (user_id, day) do update
    -- the existing row is referenced by table name here; qualifying it with the
    -- schema is rejected, which is what made every finished lesson fail
    set xp = daily_activity.xp + excluded.xp,
        lessons = daily_activity.lessons + excluded.lessons,
        updated_at = now();

  update public.learning_profiles lp
  set xp = lp.xp + award_xp,
      gems = lp.gems + award_gems,
      streak = public.streak_for(uid, day_used),
      completed_lessons = case
        when repeat_run then lp.completed_lessons
        else array_append(lp.completed_lessons, lesson_id)
      end,
      updated_at = now()
  where lp.user_id = uid
  returning lp.xp, lp.gems, lp.streak, lp.completed_lessons
  into xp, gems, streak, completed_lessons;

  awarded_xp := award_xp;
  awarded_gems := award_gems;

  return next;
end;
$$;

create or replace function public.purchase_item(item_id text)
returns table (gems integer, owned_items text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cost integer;
  balance integer;
  held text[];
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  perform public.refuse_if_blocked(uid);

  select price into cost from public.shop_items where id = item_id;

  if cost is null then
    raise exception 'That item is not for sale.';
  end if;

  select lp.gems, lp.owned_items into balance, held
  from public.learning_profiles lp
  where lp.user_id = uid;

  if balance is null then
    raise exception 'Start the course before shopping.';
  end if;

  if item_id = any(coalesce(held, '{}')) then
    raise exception 'You already own that.';
  end if;

  if balance < cost then
    raise exception 'Not enough gems.';
  end if;

  perform set_config('pylearn.awarding', 'on', true);

  update public.learning_profiles lp
  set gems = lp.gems - cost,
      owned_items = array_append(lp.owned_items, item_id),
      updated_at = now()
  where lp.user_id = uid
  returning lp.gems, lp.owned_items into gems, owned_items;

  return next;
end;
$$;

-- A blocked account leaves the board: it is a scoreboard, not a record of who
-- was once here.
drop view if exists public.leaderboard;
create view public.leaderboard
with (security_invoker = false)
as
select
  lp.user_id,
  coalesce(nullif(btrim(lp.display_name), ''), 'Learner') as name,
  lp.xp,
  lp.streak,
  lp.avatar_url
from public.learning_profiles lp
where lp.blocked_at is null;

grant select on public.leaderboard to authenticated;
revoke all on public.leaderboard from anon;

revoke all on function public.admin_block_account(text, text) from public, anon;
revoke all on function public.admin_unblock_account(text) from public, anon;
grant execute on function public.admin_block_account(text, text) to authenticated;
grant execute on function public.admin_unblock_account(text) to authenticated;
