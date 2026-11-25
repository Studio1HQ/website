-- Social growth: what an imported LinkedIn or X analytics export adds to a
-- month (app/internal/(dashboard)/socials, "Import").
--
-- engagements  the month's engagements (reactions, comments, reposts,
--              clicks…), next to impressions and posts.
-- insights     the rest of the export, as the page shows it: the month's
--              other totals (members reached, new followers, profile
--              visits…), its days, its best posts, who the audience is
--              and which files it came from. Shape and limits:
--              lib/internal/socials/insights.ts (cleanInsights).
--
-- Until this runs, logging a month by hand works as before; importing says
-- the update is needed.
--
-- Needs 20261118110000_social_metrics.sql. Safe to run again.

alter table public.social_metrics
  add column if not exists engagements bigint
    check (engagements is null or engagements >= 0);

alter table public.social_metrics
  add column if not exists insights jsonb not null default '{}'::jsonb
    check (jsonb_typeof(insights) = 'object' and pg_column_size(insights) <= 200000);

notify pgrst, 'reload schema';
