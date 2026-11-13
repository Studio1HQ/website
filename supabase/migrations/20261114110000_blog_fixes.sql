-- Blog fixes after the dashboard review (lib/internal/blog).
--
--   blog_posts_slug_unique  two posts can't hold the same URL slug, so two
--                           publishes can never write the same file. The
--                           dashboard already checks this; the index closes
--                           the gap when two people save at the same moment.
--   blog-media              WebP only: the dashboard converts every upload,
--                           so nothing else is ever stored.
--
-- Run after 20261113120000_blog_threads_and_schedule.sql. Safe to run again.
-- The dashboard works before this is run.
--
-- If the index can't be created, two posts share a slug already. Find them
-- with the query below, change one in the dashboard, and run this again:
--
--   select slug, array_agg(id) from public.blog_posts
--   where slug <> '' group by slug having count(*) > 1;

create unique index if not exists blog_posts_slug_unique
  on public.blog_posts (slug) where slug <> '';

update storage.buckets
set allowed_mime_types = array['image/webp']
where id = 'blog-media';
