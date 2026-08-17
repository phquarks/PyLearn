-- Profile pictures other learners can actually see.
--
-- Until now the picture was a file on one phone. Showing it in the League means
-- storing it somewhere shared, which is a real widening of what leaves the
-- device — so the rules are written narrowly: anyone may look, but a learner may
-- only ever write inside a folder named after their own user id.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Reading is open, because the League is shown to every signed-in learner and a
-- public URL is what lets an <Image> load without a token.
drop policy if exists "avatars are readable by anyone" on storage.objects;
create policy "avatars are readable by anyone"
  on storage.objects for select
  using (bucket_id = 'avatars');

/* Writing is confined to the caller's own folder. storage.foldername() returns
   the path segments, so the first one has to equal the caller's id: a learner
   cannot overwrite somebody else's face. */
drop policy if exists "learners write their own avatar" on storage.objects;
create policy "learners write their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "learners replace their own avatar" on storage.objects;
create policy "learners replace their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "learners remove their own avatar" on storage.objects;
create policy "learners remove their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Where the uploaded picture ended up. Null means no picture, which is the
-- normal state and what the League falls back to.
alter table public.learning_profiles
  add column if not exists avatar_url text;

-- The board gains the picture and nothing else. Email, goal, hearts and the
-- lesson list stay behind, exactly as before.
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
