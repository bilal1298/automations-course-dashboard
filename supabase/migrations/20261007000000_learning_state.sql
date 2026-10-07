-- One row per (user, field). Keys match the original dashboard so progress exports import unchanged.
create table if not exists public.learning_state (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null check (char_length(key) <= 64),
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Row Level Security: each signed-in user can only see and change their own rows.
alter table public.learning_state enable row level security;

create policy "Users read own progress" on public.learning_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own progress" on public.learning_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own progress" on public.learning_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own progress" on public.learning_state
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.learning_state from anon;
grant select, insert, update, delete on public.learning_state to authenticated;
