-- Review tracking and filters across the three form tables:
--   hackathon_registrations     /hackathons/[slug]
--   job_applications            /careers/[id]
--   devrel_cohort_applications  /devrel-cohort
--
-- Each form keeps its own table. This migration gives all three the same
-- review fields (review_status, review_notes, updated_at), adds indexes for
-- the filters the team uses most, and adds two read-only views:
--   submissions            every entry from every form, one row each
--   partner_referral_pool  people who agreed to partner referrals
-- See supabase/README.md for what each status means and example filters.
--
-- Run after 20261102120000_forms.sql and 20261102130000_devrel_cohort_applications.sql.
-- Safe to run again.

-- ---------------------------------------------------------------------
-- updated_at, stamped on every edit (e.g. changing review_status)
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.hackathon_registrations
  add column if not exists updated_at timestamptz not null default now();
alter table public.job_applications
  add column if not exists updated_at timestamptz not null default now();
alter table public.devrel_cohort_applications
  add column if not exists updated_at timestamptz not null default now();

create or replace trigger hackathon_registrations_updated_at
  before update on public.hackathon_registrations
  for each row execute function public.set_updated_at();
create or replace trigger job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();
create or replace trigger devrel_cohort_applications_updated_at
  before update on public.devrel_cohort_applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Hackathons: review status and notes
-- ---------------------------------------------------------------------

alter table public.hackathon_registrations
  add column if not exists review_status text not null default 'new',
  add column if not exists review_notes text;

alter table public.hackathon_registrations
  drop constraint if exists hackathon_registrations_review_status_check;
alter table public.hackathon_registrations
  add constraint hackathon_registrations_review_status_check
  check (review_status in ('new', 'confirmed', 'waitlisted', 'rejected', 'attended', 'no_show', 'withdrawn'));

-- ---------------------------------------------------------------------
-- Hiring: a fuller pipeline, plus notes
-- ---------------------------------------------------------------------

alter table public.job_applications
  add column if not exists review_notes text;

alter table public.job_applications
  drop constraint if exists job_applications_review_status_check;
alter table public.job_applications
  add constraint job_applications_review_status_check
  check (review_status in ('new', 'reviewing', 'shortlisted', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'));

-- ---------------------------------------------------------------------
-- Cohort: outcome fields (already in 20261102130000; repeated in case an
-- earlier copy of that file was run)
-- ---------------------------------------------------------------------

alter table public.devrel_cohort_applications
  add column if not exists outcome text
    check (outcome in ('completed', 'dropped', 'interviewed', 'hired')),
  add column if not exists referred_to text[] not null default '{}';

-- ---------------------------------------------------------------------
-- Indexes for common filters
-- ---------------------------------------------------------------------

create index if not exists hackathon_registrations_by_status
  on public.hackathon_registrations (hackathon_slug, review_status);
create index if not exists job_applications_by_status
  on public.job_applications (job_id, review_status);
create index if not exists devrel_cohort_applications_by_status
  on public.devrel_cohort_applications (cohort, review_status);

-- Look one person up across every form.
create index if not exists hackathon_registrations_by_email
  on public.hackathon_registrations (lower(email));
create index if not exists job_applications_by_email
  on public.job_applications (lower(email));
create index if not exists devrel_cohort_applications_by_email
  on public.devrel_cohort_applications (lower(email));

-- ---------------------------------------------------------------------
-- Views. security_invoker makes them obey the tables' RLS, so the public
-- anon key still sees nothing; the grants below are revoked as well.
-- ---------------------------------------------------------------------

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
  from public.devrel_cohort_applications;

comment on view public.submissions is
  'Every entry from every form, one row each. Filter by form, program, review_status or email.';

create or replace view public.partner_referral_pool
with (security_invoker = true) as
  select
    'devrel_cohort'::text as form,
    id as record_id,
    'DevRel ' || cohort as program,
    name,
    lower(email) as email,
    location,
    role,
    profile_url as profile,
    work_url as work,
    review_status,
    outcome,
    referred_to,
    created_at
  from public.devrel_cohort_applications
  where partner_consent
  union all
  select
    'hackathon',
    id,
    hackathon_name,
    name,
    lower(email),
    country,
    role,
    'https://github.com/' || github,
    null,
    review_status,
    null,
    '{}'::text[],
    created_at
  from public.hackathon_registrations
  where partner_consent;

comment on view public.partner_referral_pool is
  'Cohort applicants and hackathon registrants who agreed that Studio1 can refer them to partner companies.';

revoke all on public.submissions from anon, authenticated;
revoke all on public.partner_referral_pool from anon, authenticated;
