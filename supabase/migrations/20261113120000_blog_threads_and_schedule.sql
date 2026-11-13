-- Comment threads and scheduled publishing for the dashboard blog
-- (app/internal/(dashboard)/blog, lib/internal/blog).
--
--   blog_events.quote        the text a comment is about, selected in the
--                            editor. Empty for a comment on the whole post.
--   blog_events.parent_id    a reply's thread (the first comment's id).
--   blog_events.resolved_*   when and by whom a thread was resolved.
--   blog_posts.publish_at    reserved for scheduled publishing (a post going
--   blog_posts.scheduled_by  live on a chosen day). Nothing uses them yet:
--                            the scheduler was left out for now.
--
-- Adds columns only. Run after 20261112150000_email_delivery.sql. Safe to
-- run again.

alter table public.blog_events
  add column if not exists quote text,
  add column if not exists parent_id uuid references public.blog_events (id) on delete cascade,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by text;

create index if not exists blog_events_by_parent
  on public.blog_events (parent_id)
  where parent_id is not null;

alter table public.blog_events
  drop constraint if exists blog_events_kind_check;
alter table public.blog_events
  add constraint blog_events_kind_check check (
    kind in (
      'comment', 'review_requested', 'changes_requested', 'approved', 'published',
      'scheduled', 'unscheduled', 'publish_failed'
    )
  );

-- Resolving a thread updates its first comment.
grant update on public.blog_events to service_role;

alter table public.blog_posts
  add column if not exists publish_at timestamptz,
  add column if not exists scheduled_by text;

create index if not exists blog_posts_scheduled
  on public.blog_posts (publish_at)
  where publish_at is not null;
