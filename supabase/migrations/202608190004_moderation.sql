-- Names and pictures are seen by everyone, so they get rules.
--
-- With two learners this is theory. At a hundred it is a certainty: a name
-- pretending to be support, a URL in a nickname, a photo nobody wants on their
-- screen. Apple also refuses apps carrying user content that offer no way to
-- report it or to stop seeing a particular person, so this is a release
-- requirement as much as a decency one.

-- ------------------------------------------------------- what may be uploaded

/* Held at the bucket rather than in the app: a limit the client enforces is a
   limit the client can skip. Two megabytes is generous for something shown at
   38 points, and the type list keeps the bucket to actual images. */
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'avatars';

-- ------------------------------------------------------------ names with rules

/* A table rather than a constant, so the list can grow without a deploy. It
   ships with the impersonation cases, which are the ones that cause real harm
   here — a learner calling themselves "PyLearn Support" can ask other people
   for things. Add anything else you want refused; matching is on whole words,
   case-insensitive. */
create table if not exists public.banned_names (
  word text primary key
);

alter table public.banned_names enable row level security;

insert into public.banned_names (word) values
  ('admin'), ('administrator'), ('moderator'), ('support'),
  ('pylearn'), ('official'), ('staff')
on conflict (word) do nothing;

create or replace function public.check_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text := btrim(coalesce(new.display_name, ''));
begin
  if candidate = '' then
    return new;
  end if;

  if length(candidate) < 2 or length(candidate) > 24 then
    raise exception 'A name needs between 2 and 24 characters.';
  end if;

  -- an address in a nickname is an advert, and the League is where it would run
  if candidate ~* '(https?://|www\.|\.com|\.ru|\.net|@[a-z0-9-]+\.)' then
    raise exception 'Please leave web addresses out of your name.';
  end if;

  if exists (
    select 1 from public.banned_names b
    where candidate ~* ('(^|[^a-z])' || b.word || '([^a-z]|$)')
  ) then
    raise exception 'That name is reserved. Please choose another.';
  end if;

  return new;
end;
$$;

drop trigger if exists learning_profiles_name_check on public.learning_profiles;
create trigger learning_profiles_name_check
  before insert or update of display_name on public.learning_profiles
  for each row execute function public.check_display_name();

-- ------------------------------------------------------- reporting and hiding

create table if not exists public.profile_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references auth.users(id) on delete cascade,
  target uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  handled boolean not null default false,
  unique (reporter, target)
);

alter table public.profile_reports enable row level security;

/* A learner may file a report and see their own; nobody can read anybody
   else's, and the admin reads them through a definer function instead. */
drop policy if exists "report others" on public.profile_reports;
create policy "report others"
  on public.profile_reports for insert to authenticated
  with check (auth.uid() = reporter and target <> reporter);

drop policy if exists "read own reports" on public.profile_reports;
create policy "read own reports"
  on public.profile_reports for select to authenticated
  using (auth.uid() = reporter);

/* Blocking is personal and immediate: it does not wait for anybody to review
   anything, and it only changes what the blocker sees. */
create table if not exists public.profile_blocks (
  blocker uuid not null references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

alter table public.profile_blocks enable row level security;

drop policy if exists "manage own blocks" on public.profile_blocks;
create policy "manage own blocks"
  on public.profile_blocks for all to authenticated
  using (auth.uid() = blocker)
  with check (auth.uid() = blocker and blocked <> blocker);

-- ------------------------------------------------------------- the board again

/* The view runs as its owner, so it can see every profile — but auth.uid() is
   still the caller, which is what lets one board hide the people that
   particular learner has blocked. */
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
where not exists (
  select 1 from public.profile_blocks b
  where b.blocker = auth.uid() and b.blocked = lp.user_id
);

grant select on public.leaderboard to authenticated;
revoke all on public.leaderboard from anon;

-- --------------------------------------------------------------- admin action

/** Strips a name and picture, for when a report turns out to be right. */
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

  -- the learner keeps their progress; only what other people see is removed
  update public.learning_profiles
  set display_name = null, avatar_url = null, updated_at = now()
  where user_id = target_id;

  update public.profile_reports set handled = true where target = target_id;

  return btrim(target_email);
end;
$$;

/** What the admin needs to act: who was reported, how often, and their name. */
create or replace function public.admin_open_reports()
returns table (target uuid, email text, name text, reports bigint, last_reason text)
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
    r.target,
    u.email::text,
    coalesce(nullif(btrim(lp.display_name), ''), 'Learner') as name,
    count(*) as reports,
    (array_agg(r.reason order by r.created_at desc))[1] as last_reason
  from public.profile_reports r
  join auth.users u on u.id = r.target
  left join public.learning_profiles lp on lp.user_id = r.target
  where r.handled = false
  group by r.target, u.email, lp.display_name
  order by count(*) desc;
end;
$$;

revoke all on function public.admin_hide_profile(text) from public, anon;
revoke all on function public.admin_open_reports() from public, anon;
grant execute on function public.admin_hide_profile(text) to authenticated;
grant execute on function public.admin_open_reports() to authenticated;
