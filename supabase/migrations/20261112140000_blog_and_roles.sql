-- Blog publishing in the internal dashboard (app/internal/(dashboard)/blog),
-- and several roles per person.
--
--   internal_members.roles  every role a person has (lib/internal/roles.ts):
--                           admin, hiring_reviewer, hiring_viewer,
--                           blog_reviewer, blog_writer. Replaces the single
--                           `role` column, which stays only for old code.
--                           People outside @studio1hq.com can only be
--                           invited, and only as blog_writer.
--   blog_posts              drafts and live posts edited in the dashboard.
--                           Publishing writes the MDX file to GitHub; the
--                           row keeps the file path and its git blob sha.
--   blog_events             the review history on a post: review requests,
--                           comments, changes requested, approvals, publishes.
--   blog-media              private bucket for images uploaded while
--                           drafting. Publishing copies them into the repo.
--
-- The site's server key is the only one with access. Run after
-- 20261112130000_internal_team.sql. Safe to run again.

-- Roles ------------------------------------------------------------------

alter table public.internal_members
  add column if not exists roles text[] not null default '{}',
  add column if not exists invited_by text;

update public.internal_members
set roles = case role
  when 'admin' then array['admin']
  when 'reviewer' then array['hiring_reviewer']
  else array['hiring_viewer']
end
where roles = '{}' and status = 'active';

alter table public.internal_members
  drop constraint if exists internal_members_roles_known;
alter table public.internal_members
  add constraint internal_members_roles_known check (
    roles <@ array['admin', 'hiring_reviewer', 'hiring_viewer', 'blog_reviewer', 'blog_writer']::text[]
  );

-- Outside writers: anyone not on @studio1hq.com can only ever be a writer.
alter table public.internal_members
  drop constraint if exists internal_members_outside_writers_only;
alter table public.internal_members
  add constraint internal_members_outside_writers_only check (
    email like '%@studio1hq.com' or roles <@ array['blog_writer']::text[]
  );

grant delete on public.internal_members to service_role;

-- Blog posts --------------------------------------------------------------

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,
  updated_by text,

  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'changes_requested', 'approved', 'published')),
  reviewers text[] not null default '{}',

  slug text not null default '',
  title text not null default '',
  seo_title text not null default '',
  description text not null default '',
  tldr_summary text not null default '',
  tldr_bullets text[] not null default '{}',
  tags text[] not null default '{}',
  authors text[] not null default '{}',
  publish_date date,
  unlisted boolean not null default false,
  -- Cover: null picks the illustration from the title (app/blog-cover).
  cover_art text,
  -- An uploaded image used instead of the generated cover.
  banner_image text,
  banner_image_alt text,
  body text not null default '',
  -- Frontmatter the editor doesn't show, kept as is when publishing.
  extra_frontmatter jsonb not null default '{}',

  -- Where the post lives in the repo once it's live.
  source_path text,
  source_sha text,
  published_at timestamptz,
  published_by text,
  published_commit text
);

create unique index if not exists blog_posts_source_path
  on public.blog_posts (source_path) where source_path is not null;
create index if not exists blog_posts_by_status
  on public.blog_posts (status, updated_at desc);
create index if not exists blog_posts_by_creator
  on public.blog_posts (created_by, updated_at desc);

alter table public.blog_posts enable row level security;
grant select, insert, update, delete on public.blog_posts to service_role;
revoke all on public.blog_posts from anon, authenticated;

create table if not exists public.blog_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  actor text not null,
  kind text not null
    check (kind in ('comment', 'review_requested', 'changes_requested', 'approved', 'published')),
  body text not null default ''
);

create index if not exists blog_events_by_post
  on public.blog_events (post_id, created_at);

alter table public.blog_events enable row level security;
grant select, insert on public.blog_events to service_role;
revoke all on public.blog_events from anon, authenticated;

-- Draft images: WebP only (the dashboard converts every upload), 10 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-media', 'blog-media', false, 10485760, array['image/webp', 'image/gif'])
on conflict (id) do nothing;
