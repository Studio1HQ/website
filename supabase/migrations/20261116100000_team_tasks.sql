-- Tasks: what each person works on, what they did each day, and the weekly
-- and monthly reports they send the founders (app/internal/(dashboard)/tasks).
--
--   team_tasks      a person's own cards: for Studio1 (with an area) or for a
--                   client (an engagement), optionally part of a client
--                   deliverable. Client deliverables and community tasks are
--                   NOT copied here: the board reads them where they live,
--                   so nothing is ever entered twice.
--   team_work_logs  "on this day I spent this long on this": a task, a client
--                   deliverable, a community task, or nothing (other work).
--                   Keeps the title, area and engagement it was about, so the
--                   history holds if the card is deleted.
--   team_reports    one per person per week (Monday) or month (the 1st): the
--                   three things they write, the numbers frozen when they
--                   submit, and what the founders made of it.
--
-- Also adds the tasks_viewer role ("Team tasks: view" on the access grid,
-- for the founder's associate): everyone's tasks except admins' and the
-- founders'. The site's server key is the only one with access. Needs the
-- team, community and client work migrations (team_people,
-- community_tasks, client_engagements, client_deliverables) and
-- set_updated_at. Safe to run again.

-- Roles ------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_members_roles_known'
      and conrelid = 'public.internal_members'::regclass
      and pg_get_constraintdef(oid) like '%tasks_viewer%'
  ) then
    alter table public.internal_members
      drop constraint if exists internal_members_roles_known;
    alter table public.internal_members
      add constraint internal_members_roles_known check (
        roles <@ array[
          'admin', 'hiring_reviewer', 'hiring_viewer', 'blog_reviewer', 'blog_writer',
          'community_manager', 'community_viewer',
          'client_manager', 'client_member',
          'tasks_viewer'
        ]::text[]
      );
  end if;
end $$;

-- Tasks ------------------------------------------------------------------

create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Who added it: the person, or a founder / intern reviewer giving it to them.
  created_by text not null,
  updated_by text,

  email text not null references public.team_people (email) on update cascade on delete cascade,
  title text not null check (length(title) between 1 and 200),
  notes text not null default '',
  status text not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  -- What kind of Studio1 work; 'client' when it's for a client engagement.
  area text not null default 'other'
    check (area in ('client', 'content', 'community', 'sales', 'hiring', 'ops', 'learning', 'other')),
  -- For a client (or Studio1's own internal engagement), and optionally a
  -- step of one of its deliverables: hours logged count toward both.
  engagement_id uuid references public.client_engagements (id) on delete set null,
  deliverable_id uuid references public.client_deliverables (id) on delete set null,
  due_on date,
  -- The day it moved to Done (IST); null otherwise.
  done_on date,
  blocked boolean not null default false,
  block_reason text not null default '',

  constraint team_tasks_done check ((status = 'done') = (done_on is not null)),
  constraint team_tasks_block check (not blocked or length(block_reason) > 0)
);

create index if not exists team_tasks_by_person
  on public.team_tasks (email, status);
create index if not exists team_tasks_by_done
  on public.team_tasks (done_on) where done_on is not null;
create index if not exists team_tasks_by_deliverable
  on public.team_tasks (deliverable_id) where deliverable_id is not null;
create index if not exists team_tasks_by_engagement
  on public.team_tasks (engagement_id) where engagement_id is not null;

-- Work logs --------------------------------------------------------------

create table if not exists public.team_work_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,

  email text not null references public.team_people (email) on update cascade on delete cascade,
  day date not null,
  minutes integer not null check (minutes between 5 and 960),
  note text not null default '',

  -- What it was on: at most one card.
  task_id uuid references public.team_tasks (id) on delete set null,
  deliverable_id uuid references public.client_deliverables (id) on delete set null,
  community_task_id uuid references public.community_tasks (id) on delete set null,
  -- Kept from the card, so totals per client and area survive its deletion.
  title text not null default '' check (length(title) <= 200),
  area text not null default 'other'
    check (area in ('client', 'content', 'community', 'sales', 'hiring', 'ops', 'learning', 'other')),
  engagement_id uuid references public.client_engagements (id) on delete set null,

  constraint team_work_logs_one_card check (
    (task_id is not null)::int + (community_task_id is not null)::int <= 1
  )
);

create index if not exists team_work_logs_by_person
  on public.team_work_logs (email, day);
create index if not exists team_work_logs_by_day
  on public.team_work_logs (day);
create index if not exists team_work_logs_by_deliverable
  on public.team_work_logs (deliverable_id) where deliverable_id is not null;
create index if not exists team_work_logs_by_engagement
  on public.team_work_logs (engagement_id, day) where engagement_id is not null;

-- Reports ----------------------------------------------------------------

create table if not exists public.team_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  email text not null references public.team_people (email) on update cascade on delete cascade,
  period text not null check (period in ('week', 'month')),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'returned', 'seen')),

  -- What the person writes.
  highlights text not null default '' check (length(highlights) <= 4000),
  blockers text not null default '' check (length(blockers) <= 4000),
  next_plan text not null default '' check (length(next_plan) <= 4000),
  -- The numbers and lists as they were when it was submitted.
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  submitted_at timestamptz,

  -- A founder's read: seen, or sent back with a note.
  reviewed_by text,
  reviewed_at timestamptz,
  founder_note text not null default '' check (length(founder_note) <= 2000),

  unique (email, period, starts_on),
  constraint team_reports_week check (period <> 'week' or extract(isodow from starts_on) = 1),
  constraint team_reports_month check (period <> 'month' or extract(day from starts_on) = 1),
  constraint team_reports_range check (ends_on >= starts_on)
);

create index if not exists team_reports_by_period
  on public.team_reports (period, starts_on, status);

-- updated_at on every edit ----------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['team_tasks', 'team_work_logs', 'team_reports'] loop
    execute format(
      'create or replace trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- Access: the site's server key only -------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['team_tasks', 'team_work_logs', 'team_reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
