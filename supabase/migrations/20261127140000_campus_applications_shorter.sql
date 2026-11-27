-- The Studio1 on Campus form, made short (27 Nov 2026): who they are, the
-- community's link, committee size, average turnout at their events, a line
-- about their plans and (optionally) what would help. The community team
-- reaches out for the rest: where they're based, the event, and how we'll
-- partner. This drops the columns the form no longer asks for. The table
-- was empty when it ran.
--
-- The submissions view read applicant_role, city and country, so it's
-- re-created first (campus entries now show the college as their location
-- and no role), then the columns go.
--
-- Run after 20261127120000_campus_applications.sql. Safe to run again.

create or replace view public.submissions
with (security_invoker = true) as
  select
    'hackathon'::text as form,
    id as record_id,
    hackathon_slug as program_id,
    hackathon_name as program,
    name,
    lower(email) as email,
    country as location,
    role,
    review_status,
    partner_consent,
    created_at,
    updated_at
  from public.hackathon_registrations
  union all
  select
    'job',
    id,
    job_id,
    job_title,
    name,
    lower(email),
    location,
    job_title,
    review_status,
    false,
    created_at,
    updated_at
  from public.job_applications
  union all
  select
    'devrel_cohort',
    id,
    cohort,
    'DevRel ' || cohort,
    name,
    lower(email),
    location,
    role,
    review_status,
    partner_consent,
    created_at,
    updated_at
  from public.devrel_cohort_applications
  union all
  select
    'campus',
    id,
    null::text,
    community_name,
    name,
    lower(email),
    college,
    null::text,
    review_status,
    false,
    created_at,
    updated_at
  from public.campus_applications;

alter table public.campus_applications
  drop column if exists phone,
  drop column if exists applicant_role,
  drop column if exists community_type,
  drop column if exists city,
  drop column if exists country,
  drop column if exists member_count,
  drop column if exists events_last_year,
  drop column if exists event_type,
  drop column if exists event_name,
  drop column if exists event_when,
  drop column if exists event_format,
  drop column if exists expected_attendance,
  drop column if exists offers,
  drop column if exists offer_notes,
  drop column if exists source;

comment on column public.campus_applications.core_team_size is
  'Committee size: people organising events, including the applicant.';
comment on column public.campus_applications.event_turnout is
  'Average turnout at their events: Under 50, 50–150, 150–500 or 500+.';

grant select on public.submissions to service_role;
revoke all on public.submissions from anon, authenticated;
