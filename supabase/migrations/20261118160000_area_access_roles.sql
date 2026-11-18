-- Outreach, Influencers and Social growth become areas of their own on the
-- access grid (People → a person → What they can open), given one by one:
--
--   outreach_manager    Outreach: organisations, deal values, follow-ups
--   influencer_manager  Influencers: creators, rate cards, what was paid
--   socials_manager     Social growth: the accounts and their numbers
--
-- Admin alone no longer opens these three (lib/internal/roles.ts,
-- GRANTED_ONLY). The founders always have them in code; anyone else, admins
-- included, needs the role, and only a founder can give it. This only lets
-- the new role names into internal_members.roles. Safe to run again.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_members_roles_known'
      and conrelid = 'public.internal_members'::regclass
      and pg_get_constraintdef(oid) like '%socials_manager%'
  ) then
    alter table public.internal_members
      drop constraint if exists internal_members_roles_known;
    alter table public.internal_members
      add constraint internal_members_roles_known check (
        roles <@ array[
          'admin', 'hiring_reviewer', 'hiring_viewer', 'blog_reviewer', 'blog_writer',
          'community_manager', 'community_viewer',
          'client_manager', 'client_member',
          'tasks_viewer',
          'outreach_manager', 'influencer_manager', 'socials_manager'
        ]::text[]
      );
  end if;
end $$;
