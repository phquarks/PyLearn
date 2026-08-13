create table if not exists public.learning_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal text,
  experience text,
  language text not null default 'Python',
  xp integer not null default 120,
  streak integer not null default 3,
  hearts integer not null default 5,
  completed_lessons integer[] not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_profiles enable row level security;

drop policy if exists "Users can read own learning profile" on public.learning_profiles;
create policy "Users can read own learning profile"
on public.learning_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own learning profile" on public.learning_profiles;
create policy "Users can insert own learning profile"
on public.learning_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own learning profile" on public.learning_profiles;
create policy "Users can update own learning profile"
on public.learning_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
