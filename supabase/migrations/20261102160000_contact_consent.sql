-- Consent recorded with every form entry (lib/contact-consent.ts):
--   contact_consent  required tick: Studio1 may store these details and email
--                    about this application or registration and next steps
--   email_updates    optional opt-in to emails about future roles, cohorts
--                    and events
-- Adds both to the three form tables, plus an email_subscribers view for the
-- mailing list.
--
-- Run after 20261102150000_api_grants.sql, and before deploying the code
-- that sends these fields (inserts fail on unknown columns). Safe to run again.

alter table public.hackathon_registrations
  add column if not exists contact_consent boolean not null default false,
  add column if not exists email_updates boolean not null default false;
alter table public.job_applications
  add column if not exists contact_consent boolean not null default false,
  add column if not exists email_updates boolean not null default false;
alter table public.devrel_cohort_applications
  add column if not exists contact_consent boolean not null default false,
  add column if not exists email_updates boolean not null default false;

-- One row per person who opted in on any form. Reads the tables directly
-- (not the submissions view) so the earlier migrations stay re-runnable.
-- Handle unsubscribes in the email tool you send from.
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
  )
  select
    email,
    (array_agg(name order by created_at desc))[1] as name,
    array_agg(distinct form) as forms,
    min(created_at) as first_opted_in,
    max(created_at) as last_seen
  from opted_in
  group by email;

comment on view public.email_subscribers is
  'Everyone who ticked "email me about future Studio1 roles, cohorts and events" on any form, one row per email.';

grant select on public.email_subscribers to service_role;
revoke all on public.email_subscribers from anon, authenticated;
