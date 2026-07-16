-- Come Alive Games — feedback table
-- Run this once in your Supabase project's SQL Editor.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  name text,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists feedback_game_slug_idx on public.feedback (game_slug);

-- Enable Row Level Security
alter table public.feedback enable row level security;

-- Public can read only approved feedback
create policy "Public can read approved feedback"
  on public.feedback for select
  using (approved = true);

-- Public can insert new feedback (playtesters submitting via the form)
create policy "Public can submit feedback"
  on public.feedback for insert
  with check (true);

-- NOTE: delete/update is NOT open to the public anon key by default.
-- The admin.html page currently uses the same anon key to delete rows,
-- which means delete is either (a) also allowed here for anon, matching
-- the "public + admin password gate" model described in the README, or
-- (b) locked down further using Supabase Auth for real production use.
-- For a simple v1 (client-side admin password only), add this policy too:
create policy "Public can delete feedback (protected by client-side admin gate)"
  on public.feedback for delete
  using (true);
