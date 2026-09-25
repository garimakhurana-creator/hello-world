-- Adds provenance fields for real listings imported via Firecrawl.
-- Run in the Supabase SQL editor with the source set to your database
-- (not "Logs"). Safe to run more than once.

alter table properties add column if not exists source            text not null default 'mock';
alter table properties add column if not exists source_url        text;
alter table properties add column if not exists deposit           int;
alter table properties add column if not exists commute_estimated boolean not null default false;
alter table properties add column if not exists unknown_amenities text[] not null default '{}';
alter table properties add column if not exists imported_at       timestamptz;
