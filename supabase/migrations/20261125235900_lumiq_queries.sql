-- Messages sent from the LUMIQ landing page's query form (landing/app.js). Visitors can only add a message;
-- nobody can read, change or delete one through the public key (read them in the dashboard or with the
-- service role). NOT APPLIED YET: apply it to the "lumiq" project to switch the form on.
create table if not exists public.lumiq_queries (
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

revoke all on table public.lumiq_queries from anon, authenticated;
grant insert (name, contact, topic, message, page) on table public.lumiq_queries to anon;

drop policy if exists "Visitors can send a query" on public.lumiq_queries;
create policy "Visitors can send a query"
  on public.lumiq_queries
  for insert
  to anon
  with check (handled = false);

-- A flood guard: at most 20 messages a minute and 500 a day from everyone together.
create or replace function public.lumiq_queries_flood_guard()
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

revoke all on function public.lumiq_queries_flood_guard() from public, anon, authenticated;

drop trigger if exists lumiq_queries_flood_guard on public.lumiq_queries;
create trigger lumiq_queries_flood_guard
  before insert on public.lumiq_queries
  for each row execute function public.lumiq_queries_flood_guard();

create index if not exists lumiq_queries_created_at_idx on public.lumiq_queries (created_at desc);
