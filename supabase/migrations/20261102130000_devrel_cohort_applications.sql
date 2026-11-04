-- DevRel Cohort applications (/devrel-cohort).
--
-- Same setup as 20261102120000_forms.sql: the site writes from its API route
-- with the service-role key (lib/supabase-server.ts). RLS is on with no
-- policies, so the public anon key can neither read nor write this table.
-- Review and shortlist applicants in the Supabase table editor by setting
-- review_status. Run this once in the SQL editor, or with `supabase db push`.

create table if not exists public.devrel_cohort_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- The cohort edition from data/devrel-cohort.ts, e.g. 'Cohort 01'.
  cohort text not null,
  name text not null,
  email text not null,
  location text not null,
  role text not null,
  profile_url text not null,
  work_url text not null,
  why_devrel text not null,
  favorite_tool text,
  source text,
  -- Opted in to being referred to partner companies.
  partner_consent boolean not null default false,
  -- For the team to track selection in the dashboard.
  review_status text not null default 'new'
    check (review_status in ('new', 'reviewing', 'shortlisted', 'accepted', 'waitlisted', 'rejected')),
  review_notes text,
  -- After the program: the furthest stage reached. Null while it runs.
  outcome text
    check (outcome in ('completed', 'dropped', 'interviewed', 'hired')),
  -- Partner companies this person has been referred to.
  referred_to text[] not null default '{}',
  -- One application per person per cohort; the API answers duplicates with 409.
  constraint devrel_cohort_applications_one_per_email unique (cohort, email)
);

create index if not exists devrel_cohort_applications_by_cohort
  on public.devrel_cohort_applications (cohort, created_at desc);

alter table public.devrel_cohort_applications enable row level security;
