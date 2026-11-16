-- Outreach: the companies and people Studio1 is talking to about working
-- together, before they are clients (app/internal/(dashboard)/outreach).
--
--   outreach_orgs      one row per company or creator: kind, stage, where
--                      they came from, owner, next step and follow-up date
--   outreach_contacts  people at an organisation
--   outreach_activity  the log: notes, emails, DMs, calls, meetings and
--                      proposals, sent or received
--
-- Sponsors and campus partners stay in the community tables; this is for
-- client prospects, influencers and other partners. A won organisation is
-- turned into a client from its page, which fills client_id.
--
-- Admins only, checked in the app. The site's server key is the only one
-- with access. Needs the client work migration (client_accounts). Safe to
-- run again.

-- Organisations ----------------------------------------------------------

create table if not exists public.outreach_orgs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  name text not null,
  website text,
  -- The website's host, lowercased, without "www.": what tells two rows for
  -- the same company apart. Filled by the app.
  domain text,
  kind text not null default 'client'
    check (kind in ('client', 'influencer', 'partner', 'other')),
  stage text not null default 'lead'
    check (stage in ('lead', 'contacted', 'replied', 'call_booked', 'proposal', 'won', 'lost', 'not_now')),
  source text not null default 'outbound'
    check (source in ('inbound_call', 'inbound_email', 'referral', 'outbound', 'event', 'social', 'other')),
  -- A staff email.
  owner text,
  next_step text not null default '',
  follow_up_on date,
  last_contact_on date,
  -- What they'd want from Studio1, in a few words.
  interest text not null default '',
  est_value numeric(12, 2) check (est_value is null or est_value >= 0),
  currency text not null default 'USD',
  lost_reason text not null default '',
  -- The day it was won, lost or parked; empty while it's still in play.
  closed_on date,
  tags text[] not null default '{}',
  notes text not null default '',
  -- The client this became, once won.
  client_id uuid references public.client_accounts (id) on delete set null
);

create unique index if not exists outreach_orgs_one_per_domain
  on public.outreach_orgs (domain) where domain is not null;
create index if not exists outreach_orgs_by_stage
  on public.outreach_orgs (stage, name);
create index if not exists outreach_orgs_by_follow_up
  on public.outreach_orgs (owner, follow_up_on) where follow_up_on is not null;

-- Contacts ---------------------------------------------------------------

create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  org_id uuid not null references public.outreach_orgs (id) on delete cascade,
  name text not null,
  title text not null default '',
  -- Lowercase.
  email text,
  linkedin text,
  x_handle text not null default '',
  phone text,
  is_primary boolean not null default false,
  -- They asked not to hear from us: no email link, and a flag on the page.
  do_not_contact boolean not null default false,
  notes text not null default ''
);

create index if not exists outreach_contacts_by_org
  on public.outreach_contacts (org_id);
create index if not exists outreach_contacts_by_email
  on public.outreach_contacts (email) where email is not null;

-- Activity ---------------------------------------------------------------

create table if not exists public.outreach_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  org_id uuid not null references public.outreach_orgs (id) on delete cascade,
  contact_id uuid references public.outreach_contacts (id) on delete set null,
  kind text not null default 'note'
    check (kind in ('note', 'email', 'dm', 'call', 'meeting', 'proposal')),
  -- 'out': we reached out. 'in': they did.
  direction text not null default 'out'
    check (direction in ('out', 'in')),
  summary text not null,
  happened_on date not null default current_date
);

create index if not exists outreach_activity_by_org
  on public.outreach_activity (org_id, happened_on desc);

-- Access: the site's server key only -------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['outreach_orgs', 'outreach_contacts', 'outreach_activity'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
