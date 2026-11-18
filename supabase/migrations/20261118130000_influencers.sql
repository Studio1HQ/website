-- Influencers (app/internal/(dashboard)/influencers): the creators Studio1
-- can book for a client's launch, what each one charges, how their posts
-- usually do, and how the ones we paid for did.
--
--   influencers          one row per creator: status, topics, how to reach them
--   influencer_channels  their account on a platform: handle, followers and
--                        the views a post usually gets (one per platform)
--   influencer_rates     the rate card: a price for a format on a platform
--                        (a quote tweet, a LinkedIn post, a sponsored section)
--   influencer_posts     what they posted for us: what it cost and what it got
--
-- Platforms are checked here; formats are checked by the app
-- (lib/internal/influencers/schema.ts), so a new format needs no migration.
--
-- Also lets the audit trail (team_audit) keep rows for this area.
--
-- Admins only, checked in the app. The site's server key is the only one
-- with access. Safe to run again.

create table if not exists public.influencers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  name text not null check (length(name) between 1 and 140),
  status text not null default 'prospect'
    check (status in ('prospect', 'talking', 'active', 'past', 'avoid')),
  -- What they post about: "AI agents, dev tools".
  topics text not null default '',
  location text not null default '',
  -- Lowercase.
  email text,
  -- How to reach them when it isn't email: "DM on X", a manager's name.
  contact_via text not null default '',
  -- A staff email.
  owner text,
  tags text[] not null default '{}',
  notes text not null default ''
);

create index if not exists influencers_by_status
  on public.influencers (status, name);

create table if not exists public.influencer_channels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  influencer_id uuid not null references public.influencers (id) on delete cascade,
  platform text not null
    check (platform in ('x', 'linkedin', 'youtube', 'instagram', 'newsletter', 'other')),
  handle text not null default '',
  url text,
  -- Followers or subscribers.
  followers bigint check (followers is null or followers >= 0),
  -- Views (or impressions) a post usually gets.
  avg_views bigint check (avg_views is null or avg_views >= 0),
  -- Likes, comments, reposts and saves a post usually gets, added up.
  avg_engagements bigint check (avg_engagements is null or avg_engagements >= 0),
  -- The day those numbers were looked up.
  checked_on date,
  notes text not null default '',

  unique (influencer_id, platform)
);

create table if not exists public.influencer_rates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  influencer_id uuid not null references public.influencers (id) on delete cascade,
  platform text not null
    check (platform in ('x', 'linkedin', 'youtube', 'instagram', 'newsletter', 'other')),
  -- 'x_quote', 'linkedin_post', 'youtube_section'… (the app's list).
  format text not null check (format ~ '^[a-z0-9_]{2,40}$'),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'USD',
  -- What the price covers: "Pinned for 24h, one round of edits".
  details text not null default '',
  -- The day they quoted it.
  quoted_on date
);

create index if not exists influencer_rates_by_influencer
  on public.influencer_rates (influencer_id);
create index if not exists influencer_rates_by_format
  on public.influencer_rates (platform, format);

create table if not exists public.influencer_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  influencer_id uuid not null references public.influencers (id) on delete cascade,
  platform text not null
    check (platform in ('x', 'linkedin', 'youtube', 'instagram', 'newsletter', 'other')),
  format text not null check (format ~ '^[a-z0-9_]{2,40}$'),
  -- The client or launch it was for.
  campaign text not null default '',
  posted_on date not null default current_date,
  url text,
  -- What was paid; empty when it was free.
  cost numeric(12, 2) check (cost is null or cost >= 0),
  currency text not null default 'USD',
  views bigint check (views is null or views >= 0),
  likes bigint check (likes is null or likes >= 0),
  comments bigint check (comments is null or comments >= 0),
  reposts bigint check (reposts is null or reposts >= 0),
  saves bigint check (saves is null or saves >= 0),
  clicks bigint check (clicks is null or clicks >= 0),
  notes text not null default ''
);

create index if not exists influencer_posts_by_influencer
  on public.influencer_posts (influencer_id, posted_on desc);
create index if not exists influencer_posts_by_platform
  on public.influencer_posts (platform, posted_on desc);

-- Access: the site's server key only -------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['influencers', 'influencer_channels', 'influencer_rates', 'influencer_posts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- The audit trail takes this area too -------------------------------------

do $$
begin
  if to_regclass('public.team_audit') is not null then
    alter table public.team_audit drop constraint if exists team_audit_area_check;
    alter table public.team_audit add constraint team_audit_area_check
      check (area in ('payments', 'payroll', 'claims', 'attendance', 'people', 'intake', 'influencers'));
  end if;
end $$;

notify pgrst, 'reload schema';
