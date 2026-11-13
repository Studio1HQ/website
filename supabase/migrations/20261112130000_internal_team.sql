-- Internal dashboard team and email log (app/internal).
--
--   internal_members    who can use the dashboard besides the two owners
--                       (lib/internal/roles.ts). Signing in for the first
--                       time files a pending request; an admin approves it
--                       with a role on /internal/team.
--   internal_email_log  every email sent to an applicant from the dashboard,
--                       shown on the entry.
--
-- The site's server key is the only one with access. Run after
-- 20261112120000_internal_dashboard.sql. Safe to run again.

create table if not exists public.internal_members (
  email text primary key check (email = lower(email)),
  role text not null default 'reviewer' check (role in ('admin', 'reviewer', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  requested_at timestamptz not null default now(),
  decided_by text,
  decided_at timestamptz,
  last_seen_at timestamptz
);

alter table public.internal_members enable row level security;
grant select, insert, update on public.internal_members to service_role;
revoke all on public.internal_members from anon, authenticated;

create table if not exists public.internal_email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_table text not null,
  record_id uuid not null,
  to_email text not null,
  template text not null,
  subject text not null,
  sent_by text not null
);

create index if not exists internal_email_log_by_record
  on public.internal_email_log (source_table, record_id, created_at desc);

alter table public.internal_email_log enable row level security;
grant select, insert on public.internal_email_log to service_role;
revoke all on public.internal_email_log from anon, authenticated;
