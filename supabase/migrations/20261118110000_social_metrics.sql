-- Social growth (app/internal/(dashboard)/socials): one row per account,
-- platform and month, typed in by hand at the end of each month, so the
-- dashboard can show how Studio1's (and the founders') audiences grow.
--
-- Admins only, checked in the app. The site's server key is the only one
-- with access. Safe to run again.

create table if not exists public.social_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  -- Whose account: "Studio1", or a person's name.
  account text not null default 'Studio1' check (length(account) between 1 and 60),
  platform text not null
    check (platform in ('linkedin', 'x', 'youtube', 'instagram', 'github', 'newsletter', 'website', 'other')),
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- Followers (or subscribers, stars, visitors) at the end of the month.
  followers integer not null check (followers >= 0),
  -- Impressions or views in the month, and posts published in it.
  impressions bigint check (impressions is null or impressions >= 0),
  posts integer check (posts is null or posts >= 0),
  notes text not null default '',

  unique (account, platform, month)
);

create index if not exists social_metrics_by_month
  on public.social_metrics (month desc, account, platform);

alter table public.social_metrics enable row level security;
grant select, insert, update, delete on public.social_metrics to service_role;
revoke all on public.social_metrics from anon, authenticated;

notify pgrst, 'reload schema';
