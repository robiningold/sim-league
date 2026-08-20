-- OP TCG Liga — Idea Dump
-- Einmal im Supabase SQL Editor ausführen (Dashboard → SQL Editor → New query → Run).

-- ---------------------------------------------------------------- Tabellen
create table if not exists public.board_elements (
  id          text primary key,
  board_id    text not null default 'main',
  x           double precision not null default 0,
  y           double precision not null default 0,
  w           double precision not null default 250,
  h           double precision not null default 175,
  title       text not null default '',
  body        text not null default '',
  bullets     jsonb not null default '[]'::jsonb,
  images      jsonb not null default '[]'::jsonb,
  color       text not null default 'gold',
  group_id    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.board_links (
  id          text primary key,
  board_id    text not null default 'main',
  from_id     text not null,
  to_id       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.board_groups (
  id          text primary key,
  board_id    text not null default 'main',
  label       text not null default 'Gruppe',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists board_elements_board_idx on public.board_elements (board_id);
create index if not exists board_links_board_idx    on public.board_links (board_id);
create index if not exists board_groups_board_idx   on public.board_groups (board_id);

-- ------------------------------------------------------------ Zugriffsregeln
-- Ohne Anmeldung kommt niemand an die Daten, auch nicht mit dem anon-Key.
alter table public.board_elements enable row level security;
alter table public.board_links    enable row level security;
alter table public.board_groups   enable row level security;

drop policy if exists "liga darf alles" on public.board_elements;
drop policy if exists "liga darf alles" on public.board_links;
drop policy if exists "liga darf alles" on public.board_groups;

create policy "liga darf alles" on public.board_elements
  for all to authenticated using (true) with check (true);
create policy "liga darf alles" on public.board_links
  for all to authenticated using (true) with check (true);
create policy "liga darf alles" on public.board_groups
  for all to authenticated using (true) with check (true);

-- --------------------------------------------------------------- Realtime
-- Damit jede Änderung sofort bei allen offenen Browsern ankommt.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.board_elements'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.board_links';    exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.board_groups';   exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------- Bilder
-- Öffentlich lesbar (die Pfade sind zufällige UUIDs), schreiben nur angemeldet.
insert into storage.buckets (id, name, public)
values ('board-images', 'board-images', true)
on conflict (id) do update set public = true;

drop policy if exists "bilder lesen"   on storage.objects;
drop policy if exists "bilder ablegen" on storage.objects;
drop policy if exists "bilder löschen" on storage.objects;

create policy "bilder lesen" on storage.objects
  for select using (bucket_id = 'board-images');
create policy "bilder ablegen" on storage.objects
  for insert to authenticated with check (bucket_id = 'board-images');
create policy "bilder löschen" on storage.objects
  for delete to authenticated using (bucket_id = 'board-images');
