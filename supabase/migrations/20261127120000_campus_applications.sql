-- Studio1 on Campus applications (/community/campus): college clubs and
-- developer communities asking Studio1 to support an event they run.
--
-- Same setup as the other forms: the site writes from its API route with the
-- service-role key (lib/supabase-server.ts). RLS is on with no policies, so
-- the public anon key can neither read nor write the table. The community
-- team reviews entries on the dashboard (/community/applications), with the
-- same status, tags, notes and email tools as hackathon sign-ups.
--
-- Also adds the table to the two views every form feeds:
--   submissions        every entry from every form (Overview, "other entries")
--   email_subscribers  the mailing list (as 20261120140000 left it, + campus)
--
-- Run after 20261120140000_community_subscribers.sql. Safe to run again.

create table if not exists public.campus_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Who's applying.
  name text not null,
  email text not null,
  phone text,
  applicant_role text not null,

  -- The community.
  community_name text not null,
  community_type text not null,
  college text,
  city text not null,
  country text not null,
  community_url text not null,
  core_team_size integer not null check (core_team_size between 1 and 1000),
  member_count text not null,
  event_turnout text not null,
  events_last_year text not null,

  -- The event they want support for.
  event_type text not null,
  event_name text,
  event_when text,
  event_format text not null check (event_format in ('in_person', 'online', 'hybrid')),
  expected_attendance text not null,

  -- What they ask for, and what they offer back. Keys from lib/campus-application.ts.
  support text[] not null default '{}',
  -- Only when 'cash' is in support: what the money covers and roughly how much.
  cash_ask text,
  why_studio1 text not null,
  offers text[] not null default '{}',
  offer_notes text,
  source text,

  contact_consent boolean not null default false,
  email_updates boolean not null default false,

  -- For the community team, on the dashboard.
  review_status text not null default 'new'
    check (review_status in ('new', 'reviewing', 'in_talks', 'accepted', 'on_hold', 'rejected')),
  review_notes text,
  tags text[] not null default '{}',
  reviewed_by text
);

create or replace trigger campus_applications_updated_at
  before update on public.campus_applications
  for each row execute function public.set_updated_at();

create index if not exists campus_applications_by_status
  on public.campus_applications (review_status, created_at desc);
create index if not exists campus_applications_by_email
  on public.campus_applications (lower(email));
create index if not exists campus_applications_by_tag
  on public.campus_applications using gin (tags);

alter table public.campus_applications enable row level security;
-- New tables get no grants on this project: without this the form's route,
-- the dashboard and the security_invoker views below all fail with
-- "permission denied".
grant select, insert, update, delete on public.campus_applications to service_role;
revoke all on public.campus_applications from anon, authenticated;

-- Every entry from every form, as 20261102140000_review_and_filters.sql
-- made it, plus campus applications (program = the community's name).
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
    city || ', ' || country,
    applicant_role,
    review_status,
    false,
    created_at,
    updated_at
  from public.campus_applications;

-- The mailing list, as 20261120140000_community_subscribers.sql left it,
-- plus campus applicants who opted in.
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
    union all
    select 'campus', lower(email), name, created_at
    from public.campus_applications where email_updates
  )
  select
    email,
    (array_agg(name order by created_at desc) filter (where name is not null))[1] as name,
    array_agg(distinct form) as forms,
    min(created_at) as first_opted_in,
    max(created_at) as last_seen
  from opted_in
  group by email;

grant select on public.submissions, public.email_subscribers to service_role;
revoke all on public.submissions, public.email_subscribers from anon, authenticated;
