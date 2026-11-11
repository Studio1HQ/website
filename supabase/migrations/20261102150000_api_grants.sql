-- Table access for the site's server key.
--
-- Newer Supabase projects don't grant the API roles access to new tables
-- automatically, so without this the API routes' inserts fail with
-- "permission denied". The routes use the service_role key, which gets what
-- it needs here. anon and authenticated (the keys that can reach a browser)
-- get nothing, on top of RLS having no policies.
--
-- Run after the other migrations. Safe to run again.

grant select, insert, update, delete
  on public.hackathon_registrations,
     public.job_applications,
     public.devrel_cohort_applications
  to service_role;

grant select
  on public.submissions,
     public.partner_referral_pool
  to service_role;

revoke all
  on public.hackathon_registrations,
     public.job_applications,
     public.devrel_cohort_applications,
     public.submissions,
     public.partner_referral_pool
  from anon, authenticated;
