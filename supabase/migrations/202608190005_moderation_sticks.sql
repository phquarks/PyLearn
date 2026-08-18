-- Hiding a profile has to stay hidden.
--
-- The previous migration cleared a reported learner's name and picture, and the
-- clearing worked — for a few seconds. Then their own phone put both straight
-- back: the app still held the name in memory and saved it with the next
-- profile write, and the picture was still on disk, so the app that uploads a
-- local-only avatar happily uploaded it again. The moderation undid itself.
--
-- A hidden profile is therefore a state on the row, not a one-off edit.

alter table public.learning_profiles
  add column if not exists profile_hidden boolean not null default false;

/* While the flag is set, the name and picture are forced empty on every write.
   The learner keeps their XP, streak and everything they have finished; only
   what other people see is taken away. */
create or replace function public.guard_earned_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.profile_hidden then
    new.display_name := null;
    new.avatar_url := null;
    -- the flag itself is the admin's to change, through the functions below
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

  return new;
end;
$$;

create or replace function public.admin_hide_profile(target_email text)
returns text
language plpgsql
security definer
set search_path = public, auth, storage
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

  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = target_id::text;

  perform set_config('pylearn.awarding', 'on', true);

  update public.learning_profiles
  set display_name = null,
      avatar_url = null,
      profile_hidden = true,
      updated_at = now()
  where user_id = target_id;

  update public.profile_reports set handled = true where target = target_id;

  return btrim(target_email);
end;
$$;

/** Lets a profile show again, once whatever it was has been sorted out. */
create or replace function public.admin_show_profile(target_email text)
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
  set profile_hidden = false, updated_at = now()
  where user_id = target_id;

  return btrim(target_email);
end;
$$;

-- ------------------------------------------------- blocking comes back out

/* Learners no longer hide each other; only reporting stays. The board goes back
   to showing everyone, and the table that held personal blocks is dropped
   rather than left as dead furniture. */
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
from public.learning_profiles lp;

grant select on public.leaderboard to authenticated;
revoke all on public.leaderboard from anon;

drop table if exists public.profile_blocks;

revoke all on function public.admin_show_profile(text) from public, anon;
grant execute on function public.admin_show_profile(text) to authenticated;
