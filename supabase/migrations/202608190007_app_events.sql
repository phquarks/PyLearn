-- Crashes and a few milestones, sent to a place you can actually read.
--
-- Until now a crash was a white screen and silence: no log, no report, and a
-- learner who can only tell you "it does not work". This is the smallest thing
-- that fixes that — one table, written by the app, readable only by an admin.
--
-- Supabase rather than a third-party crash service on purpose: the project
-- already has this database, it works inside Expo Go where a native SDK does
-- not, and nobody has to hold an account somewhere else. What it cannot see is
-- a native crash that takes the whole process down before JavaScript can react;
-- that is what Sentry would add later, and it needs a real build to be worth
-- installing.

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  /* 'crash' plus a small set of milestones. Free text rather than an enum so a
     new event never needs a migration to start being recorded. */
  kind text not null,
  message text not null,
  detail text,
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists app_events_recent_idx on public.app_events (created_at desc);

alter table public.app_events enable row level security;

/* Writing is open to any signed-in account, and deliberately: a crash report
   that needed permission would be missing exactly when something is wrong.
   Reading is not — a crash carries a message that may name a learner's data,
   so it goes through the admin function below rather than a select policy. */
drop policy if exists "anyone signed in may report" on public.app_events;
create policy "anyone signed in may report"
  on public.app_events for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

/** The recent ones, newest first, for the admin screen. */
create or replace function public.admin_recent_events(limit_to integer default 40)
returns table (
  id bigint,
  kind text,
  message text,
  detail text,
  app_version text,
  platform text,
  created_at timestamptz,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  return query
  select
    e.id,
    e.kind,
    e.message,
    e.detail,
    e.app_version,
    e.platform,
    e.created_at,
    u.email::text
  from public.app_events e
  left join auth.users u on u.id = e.user_id
  order by e.created_at desc
  limit greatest(1, least(coalesce(limit_to, 40), 200));
end;
$$;

/** Clears the list once it has been looked at. */
create or replace function public.admin_clear_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  delete from public.app_events;
  get diagnostics removed = row_count;

  return removed;
end;
$$;

revoke all on function public.admin_recent_events(integer) from public, anon;
revoke all on function public.admin_clear_events() from public, anon;
grant execute on function public.admin_recent_events(integer) to authenticated;
grant execute on function public.admin_clear_events() to authenticated;
