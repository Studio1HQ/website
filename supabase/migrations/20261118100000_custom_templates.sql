-- Team-made scope templates (Clients → Templates → New template): an
-- engagement type of the team's own, like "Launch support", saved under a
-- key that starts with custom_. The built-in seven stay as they are.
-- Safe to run twice.

alter table public.client_scope_templates
  add column if not exists name text
    check (name is null or length(name) between 1 and 60);

comment on column public.client_scope_templates.name is
  'A team-made type''s name. Null for the built-in types.';

alter table public.client_scope_templates
  drop constraint if exists client_scope_templates_engagement_type_check;
alter table public.client_scope_templates
  add constraint client_scope_templates_engagement_type_check
    check (
      engagement_type in (
        'blogs_only', 'devrel_retainer', 'campaign', 'github_growth',
        'launch_content', 'community_program', 'internal'
      )
      or engagement_type ~ '^custom_[a-z0-9_]{1,40}$'
    );

alter table public.client_engagements
  drop constraint if exists client_engagements_type_check;
alter table public.client_engagements
  add constraint client_engagements_type_check
    check (
      type in (
        'blogs_only', 'devrel_retainer', 'campaign', 'github_growth',
        'launch_content', 'community_program', 'internal'
      )
      or type ~ '^custom_[a-z0-9_]{1,40}$'
    );
