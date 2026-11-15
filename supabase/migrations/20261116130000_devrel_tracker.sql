-- DevRel tracker: what the per-client Notion trackers held, in the client
-- workspace (app/internal/(dashboard)/clients/[slug]).
--
--   client_deliverables.content_type  a written piece's type: project
--                                     tutorial, guide, comparison…
--   client_deliverables.views         reach of a post (views/impressions),
--                                     summed per month
--   client_deliverables.extra_urls    more live links for one post (the
--                                     same post on X and LinkedIn); the
--                                     first stays in published_url
--   client_milestones                 dated wins per engagement: "1,000
--                                     GitHub stars", "#3 trending in Go",
--                                     with an optional metric + number
--   client_partners                   outreach per engagement: Co-GTM
--                                     companies, partners, events,
--                                     communities, ambassadors and
--                                     newsletters, with why them, the pitch,
--                                     the latest step, the client's input
--                                     and a status
--
-- Needs the client work migration (20261115130000_client_work.sql). The
-- app checks links (http(s) only, no logins or keys) and notes before
-- saving. The site's server key is the only one with access. Safe to run
-- again.

-- Deliverables: type, views, more links ------------------------------------

alter table public.client_deliverables
  add column if not exists content_type text,
  add column if not exists views integer,
  add column if not exists extra_urls text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_deliverables_content_type'
      and conrelid = 'public.client_deliverables'::regclass
  ) then
    alter table public.client_deliverables
      add constraint client_deliverables_content_type check (
        content_type is null or content_type in (
          'project_tutorial', 'guide', 'comparison', 'deep_dive',
          'listicle', 'opinion', 'case_study', 'other'
        )
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_deliverables_views'
      and conrelid = 'public.client_deliverables'::regclass
  ) then
    alter table public.client_deliverables
      add constraint client_deliverables_views check (
        views is null or views between 0 and 1000000000
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_deliverables_extra_urls'
      and conrelid = 'public.client_deliverables'::regclass
  ) then
    alter table public.client_deliverables
      add constraint client_deliverables_extra_urls check (
        cardinality(extra_urls) <= 10
      );
  end if;
end $$;

-- Milestones ------------------------------------------------------------------

create table if not exists public.client_milestones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  engagement_id uuid not null references public.client_engagements (id) on delete cascade,
  happened_on date not null,
  title text not null check (length(title) between 1 and 200),
  -- What's counted, when there's a number: "GitHub stars", "Discord members".
  metric text not null default '' check (length(metric) <= 60),
  value integer check (value is null or value between 0 and 1000000000),
  url text check (url is null or url ~* '^https?://'),
  notes text not null default '' check (length(notes) <= 2000)
);

create index if not exists client_milestones_by_engagement
  on public.client_milestones (engagement_id, happened_on desc);

-- Partners and Co-GTM -----------------------------------------------------------

create table if not exists public.client_partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  engagement_id uuid not null references public.client_engagements (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  website text check (website is null or website ~* '^https?://'),
  type text not null default 'co_gtm'
    check (type in ('co_gtm', 'partner', 'event', 'community', 'ambassador', 'media', 'other')),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'hold', 'done', 'dropped')),
  -- Who on our side runs it (a staff email).
  owner text,
  -- Why them: who they are, who we know there.
  notes text not null default '' check (length(notes) <= 2000),
  -- What we'd do together: a co-written tutorial, an event…
  pitch text not null default '' check (length(pitch) <= 3000),
  -- The latest step: "Sent a DM to their Head of Growth".
  latest text not null default '' check (length(latest) <= 1000),
  -- What the client said about it.
  client_input text not null default '' check (length(client_input) <= 2000),
  follow_up_on date
);

create index if not exists client_partners_by_engagement
  on public.client_partners (engagement_id, status);

-- updated_at on every edit ------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['client_milestones', 'client_partners'] loop
    execute format(
      'create or replace trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- Access: the site's server key only ---------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['client_milestones', 'client_partners'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
