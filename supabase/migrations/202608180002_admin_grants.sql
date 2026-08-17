-- Granting gems by email, and the authorisation that makes it safe.
--
-- The rule that matters lives here, not in the app. Every client holds the same
-- public anon key, so a check written in TypeScript is a suggestion: anyone can
-- call PostgREST directly with their own token. Hiding the screen keeps the app
-- tidy; this file is what actually stops a learner handing themselves gems.
--
-- Both functions are SECURITY DEFINER because they have to see two things the
-- caller must never be given for themselves: the admin list, and auth.users.

create table if not exists public.admins (
  email text primary key,
  added_at timestamptz not null default now()
);

-- RLS on with no policy at all: the table is unreachable from the API, and only
-- the definer functions below can read it. Leaving it readable would publish
-- the admin's address to every signed-in learner.
alter table public.admins enable row level security;

insert into public.admins (email)
values ('yakupov.miras07@gmail.com')
on conflict (email) do nothing;

/* Whether the caller is on that list. The app asks this to decide whether to
   show the screen; the functions below ask it again before doing anything,
   because a UI answer is not a permission. */
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

/*
 * Adds (or, with a negative amount, removes) gems from the account owning an
 * email address. Returns the new balance so the admin sees the result rather
 * than having to trust the button.
 */
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

  -- a ceiling so a slipped keystroke cannot mint a fortune in one call
  if abs(amount) > 100000 then
    raise exception 'That is more than one grant is allowed to move.';
  end if;

  select u.id into target_id
  from auth.users u
  where lower(u.email) = lower(btrim(target_email));

  if target_id is null then
    raise exception 'No account is registered with that email.';
  end if;

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

-- Only signed-in callers may even attempt it; the admin check inside decides.
revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_grant_gems(text, integer) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_grant_gems(text, integer) to authenticated;
