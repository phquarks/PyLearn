-- What the AI coach needs to exist: a meter, a notebook, and a shelf.
--
-- The OpenRouter key itself is nowhere in here and nowhere in the app. It is a
-- function secret, and the only code that ever sees it is supabase/functions/ai.
-- Everything below is what that function reads and writes on the way past.

/* The meter.
   Written by the edge function under the service role, so there is no insert
   policy and no way for a phone to add rows saying it spent nothing. Cost is
   weighted rather than a plain count: generating a whole lesson is not the same
   ask as one hint, and a budget that pretends otherwise buys the wrong thing. */
create table if not exists public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  cost integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists ai_calls_user_day_idx on public.ai_calls (user_id, created_at desc);

alter table public.ai_calls enable row level security;
-- no policies at all: service role bypasses RLS, everybody else sees nothing

/* The notebook.
   Every wrong answer, kept so a lesson can be built out of them later. The
   question text is copied in rather than referenced by id, because the course
   is edited and a mistake made against last month's wording should still be
   readable as what the learner actually saw. */
create table if not exists public.learner_mistakes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  /* negative for a generated lesson, so a mistake made in practice can be told
     apart from one made in the course proper */
  lesson_id integer,
  topic text,
  prompt text not null,
  chosen text,
  answer text,
  /* set once the mistake has been turned into practice, so the same three
     confusions do not produce the same lesson every time somebody taps */
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists learner_mistakes_user_idx
  on public.learner_mistakes (user_id, created_at desc);

alter table public.learner_mistakes enable row level security;

drop policy if exists "own mistakes readable" on public.learner_mistakes;
create policy "own mistakes readable"
  on public.learner_mistakes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own mistakes writable" on public.learner_mistakes;
create policy "own mistakes writable"
  on public.learner_mistakes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "own mistakes markable" on public.learner_mistakes;
create policy "own mistakes markable"
  on public.learner_mistakes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/* The shelf.
   A generated lesson is kept so it survives closing the app, and so a learner
   can go back to the one that finally made loops click. jsonb rather than a
   table of questions: this content is disposable and never queried by field. */
create table if not exists public.generated_lessons (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_lessons_user_idx
  on public.generated_lessons (user_id, created_at desc);

alter table public.generated_lessons enable row level security;

drop policy if exists "own lessons readable" on public.generated_lessons;
create policy "own lessons readable"
  on public.generated_lessons for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own lessons writable" on public.generated_lessons;
create policy "own lessons writable"
  on public.generated_lessons for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "own lessons removable" on public.generated_lessons;
create policy "own lessons removable"
  on public.generated_lessons for delete to authenticated
  using (auth.uid() = user_id);

/**
 * Marks the mistakes that went into a lesson, in one round trip.
 *
 * The alternative is an update per row from the phone, which on a flaky
 * connection half-succeeds and leaves the same confusions half-spent.
 */
create or replace function public.mark_mistakes_used(ids bigint[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.learner_mistakes
     set used_at = now()
   where id = any(ids)
     and user_id = auth.uid()
     and used_at is null;
$$;

grant execute on function public.mark_mistakes_used(bigint[]) to authenticated;
