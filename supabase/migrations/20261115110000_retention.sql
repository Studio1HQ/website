-- For the daily clean-up (app/api/cron/purge-rejected), which deletes job
-- applications 15 days after they were rejected:
--
--   kept_contacts  the email (and name) of each applicant it deletes, kept
--                  for future mailings until they unsubscribe.
--                  `email_updates` carries over what they ticked on the
--                  form; only people who opted in are on the mailing list
--                  (email_subscribers below). Unsubscribing deletes the row.
--   a delete grant on internal_email_log, so the log of emails sent to a
--                  deleted applicant goes with them.
--
-- The job refuses to delete anything until this has run (it saves the
-- contact first). Run after 20261115100000_member_profiles.sql. Safe to run
-- again.

create table if not exists public.kept_contacts (
  email text primary key check (email = lower(email)),
  name text not null default '',
  -- Which form they came from: 'job' today.
  form text not null default 'job',
  -- When they first applied, and when their application was deleted.
  first_seen timestamptz not null default now(),
  kept_at timestamptz not null default now(),
  email_updates boolean not null default false
);

alter table public.kept_contacts enable row level security;
grant select, insert, update, delete on public.kept_contacts to service_role;
revoke all on public.kept_contacts from anon, authenticated;

grant delete on public.internal_email_log to service_role;

-- The mailing list, as before, plus kept contacts who opted in.
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
  )
  select
    email,
    (array_agg(name order by created_at desc))[1] as name,
    array_agg(distinct form) as forms,
    min(created_at) as first_opted_in,
    max(created_at) as last_seen
  from opted_in
  group by email;

grant select on public.email_subscribers to service_role;
revoke all on public.email_subscribers from anon, authenticated;
