-- Rate limits for the public forms (lib/rate-limit.ts).
--
--   rate_limit_hits  one row per counted attempt: a form submission from a
--                    network, a submission for an email address, or a
--                    confirmation email to an address. The site counts the
--                    rows inside a time window before it lets the next one
--                    through.
--
-- `key` is a SHA-256 hash, never the IP address or the email itself. Rows
-- older than two days are deleted by the site as it goes.
--
-- Until this has run, the forms work as before, without limits (the site
-- logs that the table is missing). The site's server key is the only one
-- with access. Run after 20261113150000_hackathon_answers.sql. Safe to run
-- again.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_by_key
  on public.rate_limit_hits (key, created_at desc);

create index if not exists rate_limit_hits_by_time
  on public.rate_limit_hits (created_at);

alter table public.rate_limit_hits enable row level security;
grant select, insert, delete on public.rate_limit_hits to service_role;
revoke all on public.rate_limit_hits from anon, authenticated;
