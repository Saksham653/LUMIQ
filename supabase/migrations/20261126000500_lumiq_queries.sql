-- Messages sent from the LUMIQ landing page's query form (landing/app.js). Applied to the "lumiq" project on
-- 2026-11-26 as two migrations (lumiq_queries_insert_only, lumiq_queries_flood_guard_not_callable).
-- Row level security is on with one policy: visitors (anon) can only add a message. With no select, update or
-- delete policy, nobody can read, change or delete a message through the public key; read them in the dashboard.
create table public.lumiq_queries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  contact text not null check (char_length(btrim(contact)) between 3 and 120),
  topic text not null default 'question' check (topic in ('question', 'feedback', 'bug', 'business')),
  message text not null check (char_length(btrim(message)) between 5 and 2000),
  page text check (page is null or char_length(page) <= 200),
  handled boolean not null default false
);

comment on table public.lumiq_queries is 'Queries sent from the LUMIQ landing page form (insert-only for anon).';

alter table public.lumiq_queries enable row level security;

create policy "Visitors can send a query"
  on public.lumiq_queries
  for insert
  to anon
  with check (handled = false);

-- A flood guard: at most 20 messages a minute and 500 a day from everyone together.
create function public.lumiq_queries_flood_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.lumiq_queries where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Too many messages right now. Please try again in a minute.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.lumiq_queries where created_at > now() - interval '1 day') >= 500 then
    raise exception 'Too many messages today. Please try again tomorrow.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger lumiq_queries_flood_guard
  before insert on public.lumiq_queries
  for each row execute function public.lumiq_queries_flood_guard();

create index lumiq_queries_created_at_idx on public.lumiq_queries (created_at desc);

-- The flood guard runs only as the table's trigger; it is not meant to be called through the API.
revoke execute on function public.lumiq_queries_flood_guard() from public, anon, authenticated;
