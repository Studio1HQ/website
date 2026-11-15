-- Client work: clients, engagements, monthly cycles and the deliverables
-- that fill them (app/internal/(dashboard)/clients).
--
--   client_accounts         the clients themselves: status, primary contact,
--                           Slack channel id, start date, notes
--   client_engagements      a piece of work for one client (the workspace):
--                           type, account owner, dates, cadence, links to the
--                           client's own tracker and the contract
--   client_scope_templates  the default scope lines per engagement type, as
--                           jsonb; a type without a row uses the defaults in
--                           lib/internal/clients/schema.ts
--   client_cycles           one per engagement per month: state, agreed scope,
--                           retro, and an invoice flag (no amounts anywhere)
--   client_scope_lines      what a cycle promises: a kind and how many
--   client_deliverables     the pieces of work: owner, reviewer, status, the
--                           blocked flag, dates, size and links
--   client_status_events    every status change and block/unblock: the audit
--                           trail and the "stuck since" date
--   client_people           capacity per person (by email): role label,
--                           weekly points, Slack user id, active
--
-- Nothing here stores credentials, and nothing is seeded: clients are added
-- in the dashboard. Also adds the client_manager and client_member roles.
-- The site's server key is the only one with access. Needs the earlier
-- migrations (internal_members, set_updated_at from
-- 20261102140000_review_and_filters.sql). Safe to run again.

-- Roles ------------------------------------------------------------------

-- Only when the list doesn't know the client roles yet: running this file
-- again after a later migration has added more roles must not put the
-- shorter list back.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_members_roles_known'
      and conrelid = 'public.internal_members'::regclass
      and pg_get_constraintdef(oid) like '%client_manager%'
  ) then
    alter table public.internal_members
      drop constraint if exists internal_members_roles_known;
    alter table public.internal_members
      add constraint internal_members_roles_known check (
        roles <@ array[
          'admin', 'hiring_reviewer', 'hiring_viewer', 'blog_reviewer', 'blog_writer',
          'community_manager', 'community_viewer',
          'client_manager', 'client_member'
        ]::text[]
      );
  end if;
end $$;

-- Clients ----------------------------------------------------------------

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  name text not null check (length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  status text not null default 'active'
    check (status in ('prospect', 'active', 'paused', 'ended')),
  contact_name text not null default '',
  contact_email text,
  -- The Slack Connect channel's id (C0123…), or its name.
  slack_channel_id text not null default '',
  website text check (website is null or website ~* '^https?://'),
  started_on date,
  notes text not null default '',
  -- Hidden from the lists; kept for past reports.
  archived_at timestamptz
);

create index if not exists client_accounts_by_status
  on public.client_accounts (status, name);

-- Engagements ------------------------------------------------------------

create table if not exists public.client_engagements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  client_id uuid not null references public.client_accounts (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  type text not null default 'devrel_retainer'
    check (type in (
      'blogs_only', 'devrel_retainer', 'campaign', 'github_growth',
      'launch_content', 'community_program', 'internal'
    )),
  status text not null default 'active'
    check (status in ('planned', 'active', 'paused', 'ended')),
  -- The account owner (a staff email): chases client approvals.
  owner text,
  starts_on date,
  ends_on date,
  cadence text not null default 'monthly' check (cadence in ('weekly', 'monthly')),
  client_tracker_url text check (client_tracker_url is null or client_tracker_url ~* '^https?://'),
  contract_url text check (contract_url is null or contract_url ~* '^https?://'),
  notes text not null default '',

  constraint client_engagements_dates check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists client_engagements_by_client
  on public.client_engagements (client_id, status);
create index if not exists client_engagements_by_status
  on public.client_engagements (status, type);

-- Scope templates --------------------------------------------------------

create table if not exists public.client_scope_templates (
  engagement_type text primary key
    check (engagement_type in (
      'blogs_only', 'devrel_retainer', 'campaign', 'github_growth',
      'launch_content', 'community_program', 'internal'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  -- [{ "kind": "blog", "label": "Blogs", "quantity": 4,
  --    "owner_role": "writer", "due_rule": "weekly" }, …]
  lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array'),
  rhythm text not null default ''
);

-- Monthly cycles ---------------------------------------------------------

create table if not exists public.client_cycles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  engagement_id uuid not null references public.client_engagements (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  state text not null default 'planning'
    check (state in ('planning', 'active', 'closing', 'closed')),
  scope_note text not null default '',
  retro_note text not null default '',
  -- A flag and a link to the invoice tool. No amounts.
  invoice_state text not null default 'not_sent'
    check (invoice_state in ('not_sent', 'sent', 'paid')),
  invoice_url text check (invoice_url is null or invoice_url ~* '^https?://'),

  unique (engagement_id, month)
);

create index if not exists client_cycles_by_month
  on public.client_cycles (month, state);

-- Scope lines ------------------------------------------------------------

create table if not exists public.client_scope_lines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  cycle_id uuid not null references public.client_cycles (id) on delete cascade,
  -- The kinds in lib/internal/clients/schema.ts (DELIVERABLE_KINDS).
  kind text not null check (kind in (
      'blog', 'republish', 'video', 'demo', 'cookbook', 'cookbook_pr', 'launch_post',
      'social_post', 'reddit_post', 'community_post', 'outreach', 'talk', 'event',
      'call', 'onboarding', 'audit', 'case_study', 'report', 'snapshot', 'plan', 'other'
    )),
  label text not null default '',
  planned integer not null default 0 check (planned between 0 and 999),
  owner_role text check (owner_role is null or owner_role in ('founder', 'devrel', 'writer', 'socials', 'ops')),
  due_rule text check (due_rule is null or due_rule in (
      'weekly', 'first_week', 'mid_month', 'end_of_month', 'per_launch', 'milestone', 'none'
    )),
  position integer not null default 0,
  notes text not null default ''
);

create index if not exists client_scope_lines_by_cycle
  on public.client_scope_lines (cycle_id, position);

-- Deliverables -----------------------------------------------------------

create table if not exists public.client_deliverables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  engagement_id uuid not null references public.client_engagements (id) on delete cascade,
  cycle_id uuid not null references public.client_cycles (id) on delete cascade,
  scope_line_id uuid references public.client_scope_lines (id) on delete set null,
  title text not null check (length(title) between 1 and 200),
  kind text not null check (kind in (
      'blog', 'republish', 'video', 'demo', 'cookbook', 'cookbook_pr', 'launch_post',
      'social_post', 'reddit_post', 'community_post', 'outreach', 'talk', 'event',
      'call', 'onboarding', 'audit', 'case_study', 'report', 'snapshot', 'plan', 'other'
    )),
  -- Staff emails.
  owner text,
  reviewer text,
  status text not null default 'planned'
    check (status in (
      'planned', 'in_progress', 'internal_review', 'client_review',
      'changes_requested', 'approved', 'published'
    )),
  -- When the status last changed; the status events have the full story.
  status_changed_at timestamptz not null default now(),
  published_at timestamptz,
  blocked boolean not null default false,
  block_reason text not null default '',
  waits_on text check (waits_on is null or waits_on in ('studio1', 'client', 'third_party')),
  blocked_at timestamptz,
  -- The Monday of the week it's planned for.
  week date check (week is null or extract(isodow from week) = 1),
  due_on date,
  client_due_on date,
  size text not null default 'M' check (size in ('S', 'M', 'L')),
  draft_url text check (draft_url is null or draft_url ~* '^https?://'),
  review_url text check (review_url is null or review_url ~* '^https?://'),
  pr_url text check (pr_url is null or pr_url ~* '^https?://'),
  published_url text check (published_url is null or published_url ~* '^https?://'),
  notes text not null default '',

  constraint client_deliverables_block check (
    not blocked or (length(block_reason) > 0 and waits_on is not null)
  ),
  constraint client_deliverables_published check (
    status <> 'published' or published_url is not null
  )
);

create index if not exists client_deliverables_by_cycle
  on public.client_deliverables (cycle_id, status);
create index if not exists client_deliverables_by_engagement
  on public.client_deliverables (engagement_id, status);
create index if not exists client_deliverables_by_week
  on public.client_deliverables (week);
create index if not exists client_deliverables_by_due
  on public.client_deliverables (due_on) where status <> 'published';
create index if not exists client_deliverables_by_owner
  on public.client_deliverables (owner, status);
create index if not exists client_deliverables_by_reviewer
  on public.client_deliverables (reviewer, status) where reviewer is not null;

-- Status events ----------------------------------------------------------

create table if not exists public.client_status_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by text,

  deliverable_id uuid not null references public.client_deliverables (id) on delete cascade,
  -- status: from → to. blocked / unblocked: the flag (the status stays).
  -- created: the first event, to = the starting status.
  kind text not null default 'status'
    check (kind in ('created', 'status', 'blocked', 'unblocked')),
  from_status text,
  to_status text,
  comment text not null default ''
);

create index if not exists client_status_events_by_deliverable
  on public.client_status_events (deliverable_id, at desc);
create index if not exists client_status_events_by_time
  on public.client_status_events (at desc);

-- People (capacity) ------------------------------------------------------

create table if not exists public.client_people (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  name text not null default '',
  role text not null default 'devrel'
    check (role in ('founder', 'devrel', 'writer', 'socials', 'ops')),
  weekly_capacity integer not null default 6 check (weekly_capacity between 0 and 100),
  slack_user_id text not null default '',
  active boolean not null default true
);

-- updated_at on every edit ----------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'client_accounts', 'client_engagements', 'client_scope_templates',
    'client_cycles', 'client_scope_lines', 'client_deliverables', 'client_people'
  ] loop
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
  foreach t in array array[
    'client_accounts', 'client_engagements', 'client_scope_templates',
    'client_cycles', 'client_scope_lines', 'client_deliverables',
    'client_status_events', 'client_people'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
