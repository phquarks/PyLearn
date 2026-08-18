-- Awards move to the server.
--
-- Until now the phone wrote its own xp, gems and finished-lesson list straight
-- into learning_profiles. Every copy of the app carries the same public key, so
-- anyone could post themselves a million points without opening the interface —
-- which made the leaderboard meaningless and the shop's prices decorative.
--
-- After this file the client may still send those columns; they simply stop
-- taking effect. Everything that changes a balance goes through the functions
-- below, and they run as the definer so they can enforce their own rules.
--
-- What this does NOT do, stated plainly: the course lives in the app, not in the
-- database, so the server cannot check that an answer was actually right. It can
-- only cap what one lesson is worth, refuse to pay twice for the same lesson,
-- and keep the totals out of the client's hands. That turns "any number you
-- like" into "at most the honest rate", which is the part that matters for the
-- board; verifying answers needs the questions server-side and is a later job.

-- ---------------------------------------------------------------- price list

/* Prices belong here rather than in the request. A client that names its own
   price can name zero. The ids and amounts mirror src/data/cosmetics.ts — when
   one moves, the other has to follow. */
create table if not exists public.shop_items (
  id text primary key,
  price integer not null check (price > 0)
);

alter table public.shop_items enable row level security;

drop policy if exists "shop items are readable" on public.shop_items;
create policy "shop items are readable"
  on public.shop_items for select to authenticated using (true);

insert into public.shop_items (id, price) values
  ('ash', 90), ('blue', 120), ('gold', 180), ('ruby', 240), ('violet', 300),
  ('cap', 150), ('top', 260), ('crown', 400),
  ('spark', 200), ('leaf', 200), ('star', 350)
on conflict (id) do update set price = excluded.price;

-- ------------------------------------------------------------------- the lock

/* The awarding functions announce themselves with a transaction-local setting.
   Anything else that touches these columns has its change quietly discarded:
   reverting rather than raising keeps the ordinary profile save — which sends
   the whole row, including xp — working exactly as before. */
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
    new.completed_lessons := '{}';
    new.owned_items := '{}';

    return new;
  end if;

  new.xp := old.xp;
  new.gems := old.gems;
  new.streak := old.streak;
  new.completed_lessons := old.completed_lessons;
  new.owned_items := old.owned_items;

  return new;
end;
$$;

drop trigger if exists learning_profiles_guard on public.learning_profiles;
create trigger learning_profiles_guard
  before insert or update on public.learning_profiles
  for each row execute function public.guard_earned_columns();

-- --------------------------------------------------------------- the streak

/* Consecutive days ending today or yesterday. Written as islands: sorted
   descending, `day + row_number` is constant inside one unbroken run, so the
   newest run is the group whose key is the day after the latest entry. */
create or replace function public.streak_for(uid uuid, local_day date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select day from public.daily_activity where user_id = uid and lessons > 0
  ),
  islands as (
    select day, (day + (row_number() over (order by day desc)) * interval '1 day')::date as run
    from active
  )
  select case
    when (select max(day) from active) is null then 0
    -- a gap of more than one day means the streak is already broken
    when (select max(day) from active) < local_day - 1 then 0
    else (
      select count(*)::integer from islands
      where run = (select (max(day) + interval '1 day')::date from active)
    )
  end;
$$;

-- ------------------------------------------------------- finishing a lesson

/*
 * Records a finished lesson and returns the new totals.
 *
 * `local_day` comes from the phone because the day boundary follows the
 * learner's own clock, not the server's; it is clamped to a day either side of
 * the server's date so it cannot be used to invent a streak.
 */
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

  -- the shape of an honest lesson: a handful of questions, none of them extra
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

  -- practice still counts, but a finished lesson only pays in full once
  if repeat_run then
    award_xp := greatest(1, award_xp / 3);
    award_gems := 0;
  end if;

  insert into public.daily_activity (user_id, day, xp, lessons)
  values (uid, day_used, award_xp, 1)
  on conflict (user_id, day) do update
    set xp = public.daily_activity.xp + excluded.xp,
        lessons = public.daily_activity.lessons + excluded.lessons,
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

  -- what this run was worth, so the result screen can show the real figure
  -- rather than the app's own guess at the rate
  awarded_xp := award_xp;
  awarded_gems := award_gems;

  return next;
end;
$$;

-- ------------------------------------------------------------------ spending

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
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  select lp.gems, lp.hearts into balance, have
  from public.learning_profiles lp
  where lp.user_id = uid;

  if balance is null then
    raise exception 'Start the course first.';
  end if;

  if have >= 5 then
    raise exception 'Your hearts are already full.';
  end if;

  if balance < cost then
    raise exception 'Not enough gems.';
  end if;

  perform set_config('pylearn.awarding', 'on', true);

  update public.learning_profiles lp
  set gems = lp.gems - cost, hearts = 5, updated_at = now()
  where lp.user_id = uid
  returning lp.gems, lp.hearts into gems, hearts;

  return next;
end;
$$;

-- ------------------------------------------------- the day log closes too

/* The streak is now counted from daily_activity, which makes that table a
   scoreboard input rather than a private diary. Leaving the client able to
   insert rows would let anyone draw themselves a year-long streak, so writing
   is taken away entirely: complete_lesson runs as the definer and is the only
   thing that adds a day. Reading stays, because the progress chart needs it. */
drop policy if exists "Users insert own activity" on public.daily_activity;
drop policy if exists "Users update own activity" on public.daily_activity;
revoke insert, update, delete on public.daily_activity from authenticated, anon;

-- ------------------------------------------------------------------- grants

revoke all on function public.complete_lesson(integer, integer, integer, date) from public, anon;
revoke all on function public.purchase_item(text) from public, anon;
revoke all on function public.buy_hearts() from public, anon;
revoke all on function public.streak_for(uuid, date) from public, anon;

grant execute on function public.complete_lesson(integer, integer, integer, date) to authenticated;
grant execute on function public.purchase_item(text) to authenticated;
grant execute on function public.buy_hearts() to authenticated;

-- The admin grant from the previous migration writes gems directly, so it has
-- to announce itself the same way the awarding functions do.
create or replace function public.admin_grant_gems(target_email text, amount integer)
returns table (email text, gems integer)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_id uuid;
  new_total integer;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  if amount is null or amount = 0 then
    raise exception 'Give an amount other than zero.';
  end if;

  if abs(amount) > 100000 then
    raise exception 'That is more than one grant is allowed to move.';
  end if;

  select u.id into target_id
  from auth.users u
  where lower(u.email) = lower(btrim(target_email));

  if target_id is null then
    raise exception 'No account is registered with that email.';
  end if;

  perform set_config('pylearn.awarding', 'on', true);

  update public.learning_profiles lp
     set gems = greatest(0, lp.gems + amount),
         updated_at = now()
   where lp.user_id = target_id
  returning lp.gems into new_total;

  if new_total is null then
    raise exception 'That account exists but has not started the course yet.';
  end if;

  return query select btrim(target_email), new_total;
end;
$$;

revoke all on function public.admin_grant_gems(text, integer) from public, anon;
grant execute on function public.admin_grant_gems(text, integer) to authenticated;
