-- Hackathon registrations and job applications.
--
-- The site writes to these from its API routes with the service-role key
-- (lib/supabase-server.ts). RLS is on with no policies, so the public anon
-- key can neither read nor write them. Review entries in the Supabase
-- dashboard. Run this once in the SQL editor, or with `supabase db push`.

-- ---------------------------------------------------------------------
-- Hackathon registrations (/hackathons/[slug])
-- ---------------------------------------------------------------------

create table if not exists public.hackathon_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  hackathon_slug text not null,
  hackathon_name text not null,
  name text not null,
  email text not null,
  github text not null,
  country text not null,
  role text not null,
  experience text not null,
  team text not null check (team in ('solo', 'team', 'looking')),
  team_name text,
  track text not null,
  idea text,
  source text,
  partner_consent boolean not null default false,
  -- One registration per person per event; the API answers duplicates with 409.
  constraint hackathon_registrations_one_per_email unique (hackathon_slug, email)
);

create index if not exists hackathon_registrations_by_event
  on public.hackathon_registrations (hackathon_slug, created_at desc);

alter table public.hackathon_registrations enable row level security;

-- ---------------------------------------------------------------------
-- Job applications (/careers/[id])
-- ---------------------------------------------------------------------

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id text not null,
  job_title text not null,
  requisition_id text,
  name text not null,
  email text not null,
  location text not null,
  linkedin text,
  portfolio text,
  work_links text[] not null,
  plan_link text not null,
  why text not null,
  start_availability text not null,
  -- Object path in the private "job-applications" bucket.
  resume_path text not null,
  -- For the hiring team to track progress in the dashboard.
  review_status text not null default 'new'
    check (review_status in ('new', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  -- One application per person per role; the API answers duplicates with 409.
  constraint job_applications_one_per_email unique (job_id, email)
);

create index if not exists job_applications_by_role
  on public.job_applications (job_id, created_at desc);

alter table public.job_applications enable row level security;

-- Private bucket for résumés: PDFs only, 4 MB max (matches the form).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-applications', 'job-applications', false, 4194304, array['application/pdf'])
on conflict (id) do nothing;
