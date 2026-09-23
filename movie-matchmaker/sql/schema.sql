-- Run this once in the Supabase SQL editor for your project.
-- The app talks to Supabase with the service-role key only (from the
-- server), so no RLS policies are required for the app itself to work.

create extension if not exists "pgcrypto";

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id),
  status text not null default 'waiting_partner'
    check (status in ('waiting_partner', 'building_pool', 'swiping', 'final_pick', 'matched')),
  current_round int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists preferences (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  partner text not null check (partner in ('A', 'B')),
  moods text[] not null default '{}',
  mood_text text,
  languages text[] not null default '{}',
  content_type text not null check (content_type in ('movies_only', 'include_series')),
  min_rating int not null check (min_rating in (6, 7, 8, 9)),
  eras text[] not null default '{}',
  submitted_at timestamptz not null default now(),
  unique (session_id, partner)
);

create table if not exists titles_cache (
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  year int,
  imdb_id text,
  imdb_rating numeric,
  runtime_minutes int,
  synopsis text,
  poster_url text,
  genres text[] not null default '{}',
  popularity numeric,
  ott jsonb not null default '[]',
  ott_checked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (tmdb_id, media_type)
);

create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  tmdb_ids jsonb not null,
  order_a jsonb not null,
  order_b jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, round)
);

create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  partner text not null check (partner in ('A', 'B')),
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  liked boolean not null,
  created_at timestamptz not null default now(),
  unique (session_id, round, partner, tmdb_id)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  is_final_pick boolean not null default false,
  matched_at timestamptz not null default now(),
  unique (session_id)
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rating int not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_swipes_session_round on swipes(session_id, round);
create index if not exists idx_preferences_session on preferences(session_id);
