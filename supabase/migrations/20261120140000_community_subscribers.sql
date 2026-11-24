-- Email signups from the public /community page ("tell me about the next
-- hackathon or meetup"). One row per address; signing up again is turned
-- away by the unique index and the route treats that as success. Written by
-- the site's service role, never read by the browser. Unsubscribing deletes
-- the row (lib/unsubscribe.ts).
--
-- Run after 20261115110000_retention.sql: the mailing list view below keeps
-- its kept_contacts branch. Safe to run again.

create table if not exists public.community_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  source text not null default 'community'
);

create unique index if not exists community_subscribers_email_key
  on public.community_subscribers (lower(email));

alter table public.community_subscribers enable row level security;
-- New tables get no grants on this project: without this the signup route
-- and the security_invoker view below both fail with "permission denied".
grant select, insert, update, delete on public.community_subscribers to service_role;
revoke all on public.community_subscribers from anon, authenticated;

-- Community signups join everyone else who opted in to email updates
-- (the list as 20261115110000_retention.sql left it, plus community).
create or replace view public.email_subscribers
with (security_invoker = true) as
  with opted_in as (
    select 'hackathon'::text as form, lower(email) as email, name, created_at
    from public.hackathon_registrations where email_updates
    union all
    select 'job', lower(email), name, created_at
    from public.job_applications where email_updates
    union all
    select 'devrel_cohort', lower(email), name, created_at
    from public.devrel_cohort_applications where email_updates
    union all
    select form, email, name, first_seen
    from public.kept_contacts where email_updates
    union all
    select 'community', lower(email), null::text, created_at
    from public.community_subscribers
  )
  select
    email,
    (array_agg(name order by created_at desc) filter (where name is not null))[1] as name,
    array_agg(distinct form) as forms,
    min(created_at) as first_opted_in,
    max(created_at) as last_seen
  from opted_in
  group by email;

grant select on public.email_subscribers to service_role;
revoke all on public.email_subscribers from anon, authenticated;
