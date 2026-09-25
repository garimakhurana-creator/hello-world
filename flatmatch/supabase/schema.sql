-- FlatMatch schema. Run in the Supabase SQL editor, then `npm run seed`.
-- The app talks to Supabase only from the server with the service-role key,
-- so RLS is enabled with no public policies: the anon key can read nothing.

create extension if not exists pgcrypto;

create table if not exists groups (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  expected_size int  not null default 3 check (expected_size between 2 and 6),
  created_at    timestamptz not null default now()
);

create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  name         text not null,
  role         text not null check (role in ('coordinator', 'member')),
  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists members_group_idx on members(group_id);

-- One row per person. Hard constraints are typed columns; amenities and
-- furnishing carry an explicit level: 'must' (non-negotiable) or 'prefer'.
create table if not exists requirements (
  member_id       uuid primary key references members(id) on delete cascade,
  group_id        uuid not null references groups(id) on delete cascade,
  budget_max      int  not null,
  office_hub      text not null,
  commute_max     int  not null,
  commute_level   text not null check (commute_level in ('must', 'prefer')),
  min_bedrooms    int  not null,
  min_bathrooms   int  not null,
  preferred_areas text[] not null default '{}',
  excluded_areas  text[] not null default '{}',
  amenities       jsonb not null default '{}',   -- {"lift":"must","gym":"prefer"}
  furnishing      jsonb not null,                -- {"value":"semi","level":"prefer"}
  no_ground_floor boolean not null default false,
  max_floor       int,
  notes           text not null default '',
  updated_at      timestamptz not null default now()
);
create index if not exists requirements_group_idx on requirements(group_id);

create table if not exists properties (
  id           text primary key,
  title        text not null,
  area         text not null,
  address      text not null,
  rent         int  not null,
  bedrooms     int  not null,
  bathrooms    int  not null,
  floor        int  not null,
  total_floors int  not null,
  lift         boolean not null,
  parking      boolean not null,
  furnishing   text not null check (furnishing in ('furnished', 'semi', 'unfurnished')),
  pet_friendly boolean not null,
  amenities    text[] not null default '{}',
  commute      jsonb not null,                   -- {"Hinjewadi":25,...} minutes
  description  text not null,
  image_url    text not null
);

-- Cached Gemini wording. Matching itself is recomputed deterministically on
-- every request; only the natural-language layer is stored.
create table if not exists explanations (
  group_id   uuid not null references groups(id) on delete cascade,
  scope      text not null,                      -- 'summary' | 'results'
  input_hash text not null,
  content    jsonb not null,
  created_at timestamptz not null default now(),
  primary key (group_id, scope)
);

alter table groups       enable row level security;
alter table members      enable row level security;
alter table requirements enable row level security;
alter table properties   enable row level security;
alter table explanations enable row level security;
