-- Deleting your account, from inside the app.
--
-- Apple requires this of any app that lets you create an account, and review
-- rejects apps that only offer sign-out. It is also the plainly right thing:
-- somebody who joined should be able to leave and take their data with them.
--
-- The function runs as its definer because auth.users is not the caller's to
-- write. It deletes exactly one row — the caller's own — and everything else
-- follows: learning_profiles and daily_activity both cascade from auth.users,
-- so the profile, the day log and the streak history go with it. The avatar is
-- the one thing that does not cascade, because it lives in storage rather than
-- in a table, so it is removed by hand first.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  -- the picture, which the cascade would otherwise leave orphaned in the bucket
  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = uid::text;

  /* Everything earned is on its way out, so the guard has to stand aside — a
     trigger that quietly restores values would fight a deletion it cannot win
     but could still make noisy. */
  perform set_config('pylearn.awarding', 'on', true);

  delete from public.learning_profiles where user_id = uid;
  delete from public.daily_activity where user_id = uid;

  -- last, because it is the row the others hang from
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
