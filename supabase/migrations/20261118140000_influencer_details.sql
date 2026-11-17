-- Influencer details (app/internal/(dashboard)/influencers): what's needed
-- to pick between creators, not just list them.
--
--   influencers          niches (from the app's list, for filtering), who
--                        their audience is, the languages they post in and
--                        their style
--   influencer_channels  the typical post (median views, which a few viral
--                        posts can't lift), their best recent post, and how
--                        often they post; for a newsletter, its open and
--                        click rates (subscribers are the followers column)
--
-- Newsletter sponsorship formats (primary slot, dedicated send…) are the
-- app's list, so they need nothing here.
--
-- Needs the influencers migration (20261118130000_influencers.sql). Adds
-- columns only. Safe to run again.

alter table public.influencers
  add column if not exists niches text[] not null default '{}',
  add column if not exists audience text not null default '',
  add column if not exists languages text not null default '',
  add column if not exists content_style text not null default '';

create index if not exists influencers_by_niche
  on public.influencers using gin (niches);

alter table public.influencer_channels
  add column if not exists median_views bigint
    check (median_views is null or median_views >= 0),
  add column if not exists best_views bigint
    check (best_views is null or best_views >= 0),
  add column if not exists posts_per_month integer
    check (posts_per_month is null or posts_per_month between 0 and 1000),
  -- Percent of subscribers who open an issue, and who click in it.
  add column if not exists open_rate numeric(5, 2)
    check (open_rate is null or open_rate between 0 and 100),
  add column if not exists click_rate numeric(5, 2)
    check (click_rate is null or click_rate between 0 and 100);

notify pgrst, 'reload schema';
