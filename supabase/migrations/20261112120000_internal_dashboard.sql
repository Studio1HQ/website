-- Internal dashboard (/internal, app/internal), on the three form tables:
--   tags         labels the team adds (e.g. "Strong fit", "Not a fit"); the
--                dashboard filters and bulk-edits by them
--   reviewed_by  the teammate who last changed an entry's status, notes or
--                tags in the dashboard
-- Until this runs the dashboard still works, without tags or reviewed_by.
-- Sign-in uses Supabase Auth magic links and needs no tables here.
--
-- Run after the other migrations. Safe to run again.

alter table public.job_applications
  add column if not exists tags text[] not null default '{}',
  add column if not exists reviewed_by text;
alter table public.hackathon_registrations
  add column if not exists tags text[] not null default '{}',
  add column if not exists reviewed_by text;
alter table public.devrel_cohort_applications
  add column if not exists tags text[] not null default '{}',
  add column if not exists reviewed_by text;

create index if not exists job_applications_by_tag
  on public.job_applications using gin (tags);
create index if not exists hackathon_registrations_by_tag
  on public.hackathon_registrations using gin (tags);
create index if not exists devrel_cohort_applications_by_tag
  on public.devrel_cohort_applications using gin (tags);
