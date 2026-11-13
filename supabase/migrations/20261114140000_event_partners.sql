-- Several campus partners per event, each with a role. The event's own
-- partner_id stays its main host; this table holds everyone else: co-hosts,
-- the venue, community partners, outreach partners. A partner's page lists
-- every event it's linked to, hackathons included.
--
-- Needs 20261113140000_community.sql. Until this runs, the event and
-- partner pages work as before and say this migration is waiting. Safe to
-- run again.

create table if not exists public.community_event_partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  event_id uuid not null references public.community_events (id) on delete cascade,
  partner_id uuid not null references public.community_partners (id) on delete cascade,
  role text not null default 'community'
    check (role in ('co_host', 'venue', 'community', 'outreach', 'other')),
  notes text not null default '' check (char_length(notes) <= 300),

  constraint community_event_partners_once unique (event_id, partner_id, role)
);

create index if not exists community_event_partners_by_partner
  on public.community_event_partners (partner_id);

-- Access: the site's server key only, like the other community tables.
alter table public.community_event_partners enable row level security;
grant select, insert, update, delete on public.community_event_partners to service_role;
revoke all on public.community_event_partners from anon, authenticated;
