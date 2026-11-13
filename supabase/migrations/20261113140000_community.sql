-- Community: events, sponsors, campus partners, budget, tasks and growth
-- numbers for the community manager (app/internal/(dashboard)/community).
--
--   community_partners      colleges, student clubs, venues and other
--                           communities, with their stage and next follow-up
--   community_sponsors      the sponsor CRM: stage, tier, proposal, follow-ups
--   community_contacts      people at a sponsor or a partner
--   community_events        meetups, hackathons, campus events, workshops…
--   community_guests        an event's guest list: registrations, check-ins
--   community_sponsorships  money (or kind) a sponsor gives, per event
--   community_expenses      what events cost: planned, to pay, paid
--   community_tasks         who does what by when
--   community_activity      the outreach log: notes, emails, calls, meetings
--   community_metrics       growth numbers per channel (Discord, X, …) by date
--
-- Also adds the community_manager and community_viewer roles. The site's
-- server key is the only one with access. Needs the earlier migrations
-- (internal_members, hackathon review_status), not the team one. Safe to
-- run again.

-- Roles ------------------------------------------------------------------

-- Only when the list doesn't know the community roles yet: running this
-- file again after a later migration has added more roles must not put the
-- shorter list back.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_members_roles_known'
      and conrelid = 'public.internal_members'::regclass
      and pg_get_constraintdef(oid) like '%community_manager%'
  ) then
    alter table public.internal_members
      drop constraint if exists internal_members_roles_known;
    alter table public.internal_members
      add constraint internal_members_roles_known check (
        roles <@ array[
          'admin', 'hiring_reviewer', 'hiring_viewer', 'blog_reviewer', 'blog_writer',
          'community_manager', 'community_viewer'
        ]::text[]
      );
  end if;
end $$;

-- Partners (campus) ------------------------------------------------------

create table if not exists public.community_partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  name text not null,
  kind text not null default 'college'
    check (kind in ('college', 'club', 'venue', 'community', 'company')),
  -- A student club's college.
  parent_id uuid references public.community_partners (id) on delete set null,
  stage text not null default 'prospect'
    check (stage in ('prospect', 'contacted', 'in_talks', 'active', 'paused', 'ended')),
  city text not null default '',
  country text not null default 'India',
  website text,
  -- Students or members they reach; a venue's seats.
  reach integer check (reach is null or reach >= 0),
  capacity integer check (capacity is null or capacity >= 0),
  agreement_url text,
  owner text,
  next_step text not null default '',
  follow_up_on date,
  last_contact_on date,
  notes text not null default '',
  tags text[] not null default '{}'
);

create index if not exists community_partners_by_stage
  on public.community_partners (stage, name);

-- Sponsors ---------------------------------------------------------------

create table if not exists public.community_sponsors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  name text not null,
  website text,
  industry text not null default '',
  stage text not null default 'lead'
    check (stage in ('lead', 'contacted', 'in_talks', 'proposal', 'won', 'lost', 'paused')),
  tier text not null default '',
  -- What the proposal asks for.
  ask_amount numeric(12, 2) check (ask_amount is null or ask_amount >= 0),
  currency text not null default 'INR',
  proposal_url text,
  proposal_sent_on date,
  owner text,
  next_step text not null default '',
  follow_up_on date,
  last_contact_on date,
  notes text not null default '',
  tags text[] not null default '{}'
);

create index if not exists community_sponsors_by_stage
  on public.community_sponsors (stage, name);

-- Contacts ---------------------------------------------------------------

create table if not exists public.community_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  sponsor_id uuid references public.community_sponsors (id) on delete cascade,
  partner_id uuid references public.community_partners (id) on delete cascade,
  name text not null,
  title text not null default '',
  email text,
  phone text,
  linkedin text,
  is_primary boolean not null default false,
  notes text not null default '',

  constraint community_contacts_one_owner check (num_nonnulls(sponsor_id, partner_id) = 1)
);

create index if not exists community_contacts_by_sponsor
  on public.community_contacts (sponsor_id) where sponsor_id is not null;
create index if not exists community_contacts_by_partner
  on public.community_contacts (partner_id) where partner_id is not null;

-- Events -----------------------------------------------------------------

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  name text not null,
  kind text not null default 'meetup'
    check (kind in ('meetup', 'hackathon', 'campus', 'workshop', 'webinar', 'conference', 'other')),
  status text not null default 'planning'
    check (status in ('idea', 'planning', 'confirmed', 'live', 'done', 'cancelled')),
  format text not null default 'in_person'
    check (format in ('in_person', 'online', 'hybrid')),
  starts_on date,
  ends_on date,
  start_time time,
  city text not null default '',
  venue text not null default '',
  -- The college, club or venue hosting it.
  partner_id uuid references public.community_partners (id) on delete set null,
  -- Links a hackathon to its registrations from the site form.
  hackathon_slug text,
  registration_url text,
  capacity integer check (capacity is null or capacity >= 0),
  -- Typed in when there's no guest list here (Luma, Meetup, …).
  registered_count integer check (registered_count is null or registered_count >= 0),
  attended_count integer check (attended_count is null or attended_count >= 0),
  budget numeric(12, 2) check (budget is null or budget >= 0),
  currency text not null default 'INR',
  owner text,
  recap_url text,
  notes text not null default '',
  tags text[] not null default '{}'
);

create index if not exists community_events_by_date
  on public.community_events (starts_on desc nulls last);

-- Guest list -------------------------------------------------------------

create table if not exists public.community_guests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  event_id uuid not null references public.community_events (id) on delete cascade,
  name text not null default '',
  email text not null check (email = lower(email)),
  organisation text not null default '',
  role text not null default 'attendee'
    check (role in ('attendee', 'speaker', 'mentor', 'judge', 'volunteer', 'organiser')),
  status text not null default 'registered'
    check (status in ('registered', 'confirmed', 'waitlisted', 'attended', 'no_show', 'cancelled')),
  checked_in_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'import')),
  notes text not null default '',

  unique (event_id, email)
);

create index if not exists community_guests_by_email
  on public.community_guests (email);

-- Sponsorships -----------------------------------------------------------

create table if not exists public.community_sponsorships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  sponsor_id uuid not null references public.community_sponsors (id) on delete cascade,
  -- Null: a general sponsorship, not for one event.
  event_id uuid references public.community_events (id) on delete set null,
  amount numeric(12, 2) check (amount is null or amount >= 0),
  currency text not null default 'INR',
  -- Swag, credits, venue, food… anything not paid in money.
  in_kind text not null default '',
  status text not null default 'pledged'
    check (status in ('pledged', 'invoiced', 'paid', 'cancelled')),
  invoice_ref text not null default '',
  due_on date,
  paid_on date,
  notes text not null default ''
);

create index if not exists community_sponsorships_by_event
  on public.community_sponsorships (event_id);

-- Expenses ---------------------------------------------------------------

create table if not exists public.community_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  -- Null: general community spend, not for one event.
  event_id uuid references public.community_events (id) on delete set null,
  category text not null default 'other'
    check (category in ('venue', 'food', 'swag', 'travel', 'prizes', 'marketing', 'tools', 'speakers', 'other')),
  description text not null,
  vendor text not null default '',
  amount numeric(12, 2) check (amount is null or amount >= 0),
  currency text not null default 'INR',
  -- planned: an estimate; to_pay: owed (invoice in); paid.
  status text not null default 'planned'
    check (status in ('planned', 'to_pay', 'paid', 'cancelled')),
  due_on date,
  paid_on date,
  receipt_url text,
  notes text not null default ''
);

create index if not exists community_expenses_by_event
  on public.community_expenses (event_id);

-- Tasks ------------------------------------------------------------------

create table if not exists public.community_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  title text not null,
  details text not null default '',
  -- A staff email, or the name of a volunteer without a login.
  owner text,
  due_on date,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'todo'
    check (status in ('todo', 'doing', 'blocked', 'done')),
  event_id uuid references public.community_events (id) on delete set null,
  sponsor_id uuid references public.community_sponsors (id) on delete set null,
  partner_id uuid references public.community_partners (id) on delete set null,
  completed_at timestamptz
);

create index if not exists community_tasks_by_status
  on public.community_tasks (status, due_on);

-- Activity ---------------------------------------------------------------

create table if not exists public.community_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  sponsor_id uuid references public.community_sponsors (id) on delete cascade,
  partner_id uuid references public.community_partners (id) on delete cascade,
  event_id uuid references public.community_events (id) on delete cascade,
  kind text not null default 'note'
    check (kind in ('note', 'email', 'call', 'meeting', 'proposal')),
  body text not null,
  happened_on date not null default current_date
);

create index if not exists community_activity_by_sponsor
  on public.community_activity (sponsor_id, happened_on desc) where sponsor_id is not null;
create index if not exists community_activity_by_partner
  on public.community_activity (partner_id, happened_on desc) where partner_id is not null;
create index if not exists community_activity_by_event
  on public.community_activity (event_id, happened_on desc) where event_id is not null;

-- Growth numbers ---------------------------------------------------------

create table if not exists public.community_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  channel text not null check (channel ~ '^[a-z0-9_]{2,24}$'),
  recorded_on date not null,
  value integer not null check (value >= 0),
  notes text not null default '',

  unique (channel, recorded_on)
);

-- Counts for the dashboard -----------------------------------------------
-- signed_up counts the waitlist but not cancellations or rejections.

create or replace view public.community_guest_counts
with (security_invoker = true) as
  select
    event_id,
    count(*) filter (where status <> 'cancelled') as signed_up,
    count(*) filter (where status = 'attended') as attended,
    count(*) filter (where status = 'waitlisted') as waitlisted,
    count(*) filter (where status = 'no_show') as no_show
  from public.community_guests
  group by event_id;

-- Hackathon sign-ups from the site form, per hackathon.
create or replace view public.community_hackathon_counts
with (security_invoker = true) as
  select
    hackathon_slug,
    (array_agg(hackathon_name order by created_at desc))[1] as hackathon_name,
    count(*) filter (where review_status not in ('rejected', 'withdrawn')) as signed_up,
    count(*) filter (where review_status = 'attended') as attended,
    count(*) filter (where review_status = 'waitlisted') as waitlisted,
    count(*) filter (where review_status = 'no_show') as no_show
  from public.hackathon_registrations
  group by hackathon_slug;

-- Everyone the community has reached: one row per email, from guest lists
-- and hackathon sign-ups, with when they first showed up. Each event counts
-- once per person: a site registration belongs to the community event with
-- the same hackathon_slug when there is one. (Same definition as
-- 20261114130000_community_fixes.sql, so running this file again doesn't
-- put the older row-counting version back.)
create or replace view public.community_people
with (security_invoker = true) as
  with seen as (
    select
      g.email,
      'e:' || g.event_id::text as event_key,
      coalesce(e.starts_on, g.created_at::date) as seen_on,
      (g.status = 'attended') as attended
    from public.community_guests g
    join public.community_events e on e.id = g.event_id
    where g.status <> 'cancelled'
    union all
    select
      lower(h.email),
      coalesce(
        (
          select 'e:' || e.id::text
          from public.community_events e
          where e.hackathon_slug = h.hackathon_slug
          order by e.created_at
          limit 1
        ),
        'h:' || h.hackathon_slug
      ),
      h.created_at::date,
      (h.review_status = 'attended')
    from public.hackathon_registrations h
    where h.review_status not in ('rejected', 'withdrawn')
  )
  select
    email,
    min(seen_on) as first_seen,
    count(distinct event_key) as events,
    count(distinct event_key) filter (where attended) as attended
  from seen
  group by email;

-- New people per month, for the growth chart.
create or replace view public.community_people_by_month
with (security_invoker = true) as
  select
    to_char(first_seen, 'YYYY-MM') as month,
    count(*) as people,
    count(*) filter (where events > 1) as came_back
  from public.community_people
  group by 1;

grant select on public.community_guest_counts, public.community_hackathon_counts,
  public.community_people, public.community_people_by_month to service_role;
revoke all on public.community_guest_counts, public.community_hackathon_counts,
  public.community_people, public.community_people_by_month from anon, authenticated;

-- Access: the site's server key only -------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'community_partners', 'community_sponsors', 'community_contacts',
    'community_events', 'community_guests', 'community_sponsorships',
    'community_expenses', 'community_tasks', 'community_activity',
    'community_metrics'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
