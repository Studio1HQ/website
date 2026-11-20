-- The DevRel jobs board (studio1hq.com/devrel-jobs) moves from
-- data/devrel-jobs.json to this table, so listings are added and changed on
-- the dashboard's DevRel jobs page (dashboard.studio1hq.com/job-board)
-- instead of in code.
--
--   devrel_jobs        one row per listing; "live" puts it on the board,
--                      "featured" pins it to the top. The logo isn't stored:
--                      the site finds the icon of "website" (or of the apply
--                      link when that's on the company's own site).
--   job_board_editor   a new role: edit the board. Admins can edit it too
--                      (checked in the app, lib/internal/roles.ts).
--   team_audit         takes the area 'job_board', so every change is on
--                      the audit trail.
--
-- The site's server key is the only one with access to the table. Seeds
-- the five listings from the JSON file once, into an empty table. Safe to
-- run again.

create table if not exists public.devrel_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  title text not null check (length(title) between 1 and 140),
  company text not null check (length(company) between 1 and 80),
  -- The company's website, for its logo.
  website text check (website is null or (website ~ '^https?://' and length(website) <= 300)),
  -- Where people apply.
  url text not null check (url ~ '^https?://' and length(url) <= 1000),
  location text not null default '' check (length(location) <= 120),
  workplace text not null default 'Unspecified'
    check (workplace in ('Remote', 'Hybrid', 'On-site', 'Unspecified')),
  category text not null default 'Developer Relations' check (length(category) between 1 and 60),
  job_type text not null default 'Full-time' check (length(job_type) between 1 and 40),
  level text not null default 'Unspecified' check (length(level) between 1 and 40),
  salary text check (salary is null or length(salary) <= 80),
  posted_on date not null default current_date,
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  featured boolean not null default false,
  live boolean not null default true
);

create index if not exists devrel_jobs_live_newest
  on public.devrel_jobs (live, posted_on desc);

alter table public.devrel_jobs enable row level security;
grant select, insert, update, delete on public.devrel_jobs to service_role;
revoke all on public.devrel_jobs from anon, authenticated;

-- The listings from data/devrel-jobs.json --------------------------------

insert into public.devrel_jobs
  (title, company, website, url, location, workplace, category, job_type, level, salary, posted_on, tags, featured)
select *
from (
  values
    ('Head of Developer Relations', 'ClickHouse', 'https://clickhouse.com', 'https://jobs.ashbyhq.com/clickhouse/f8d77096-72a6-41bd-bea5-af2932e394fd', 'United States', 'Remote', 'Developer Relations', 'Full-time', 'Head', '$196K - $300K', date '2026-11-11', array['Developer Relations', 'Databases', 'ClickHouse Cloud']::text[], false),
    ('Developer Relations', 'Cerebras Systems', 'https://cerebras.ai', 'https://jobs.ashbyhq.com/cerebras/ae958e4c-2f4b-43e6-bdbd-47ab32b80e03', 'Sunnyvale, CA', 'Hybrid', 'Developer Relations', 'Full-time', 'Unspecified', null, date '2026-11-05', array['Developer Relations', 'AI', 'Cerebras Inference']::text[], false),
    ('Senior Developer Relations, Twitter Brand Rep', 'Supabase', 'https://supabase.com', 'https://jobs.ashbyhq.com/supabase/985abb8d-cb2b-4f32-97d7-497e9f89e3ce', 'Remote, Global', 'Remote', 'Developer Relations', 'Full-time', 'Senior', null, date '2026-11-04', array['Developer Relations', 'Postgres', 'Supabase']::text[], false),
    ('Senior ML Engineer, Developer Relations Engineering', 'Crusoe', 'https://crusoe.ai', 'https://jobs.ashbyhq.com/Crusoe/06c41456-0789-495d-affd-bc88d7ea9d44', 'San Francisco, CA - US', 'On-site', 'Developer Relations', 'Full-time', 'Senior', '$180K - $220K', date '2026-11-02', array['Developer Relations', 'AI Infrastructure', 'Crusoe Cloud']::text[], false),
    ('Staff Developer Relations Engineer', 'Render', 'https://render.com', 'https://jobs.ashbyhq.com/render/5498e2c2-44d7-4a4b-9bb9-20c0eca92440', 'Remote: United States', 'Remote', 'Developer Relations', 'Full-time', 'Staff', '$204K - $250K', date '2026-10-30', array['Developer Relations', 'Cloud', 'Render']::text[], false)
) as seed (title, company, website, url, location, workplace, category, job_type, level, salary, posted_on, tags, featured)
where not exists (select 1 from public.devrel_jobs);

-- The new role -----------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_members_roles_known'
      and conrelid = 'public.internal_members'::regclass
      and pg_get_constraintdef(oid) like '%job_board_editor%'
  ) then
    alter table public.internal_members
      drop constraint if exists internal_members_roles_known;
    alter table public.internal_members
      add constraint internal_members_roles_known check (
        roles <@ array[
          'admin', 'hiring_reviewer', 'hiring_viewer', 'blog_reviewer', 'blog_writer',
          'community_manager', 'community_viewer',
          'client_manager', 'client_member',
          'tasks_viewer',
          'outreach_manager', 'influencer_manager', 'socials_manager',
          'job_board_editor'
        ]::text[]
      );
  end if;
end $$;

-- The audit trail takes this area too -------------------------------------

do $$
begin
  if to_regclass('public.team_audit') is not null then
    alter table public.team_audit drop constraint if exists team_audit_area_check;
    alter table public.team_audit add constraint team_audit_area_check
      check (area in ('payments', 'payroll', 'claims', 'attendance', 'people', 'intake', 'influencers', 'job_board'));
  end if;
end $$;

notify pgrst, 'reload schema';
