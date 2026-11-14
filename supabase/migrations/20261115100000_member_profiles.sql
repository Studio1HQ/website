-- A name on each dashboard member (internal_members), so people who aren't
-- on the team list (team_people), like an outside writer or someone still
-- waiting for approval, have a profile too: they type their name on the
-- "Waiting for approval" page or on /internal/profile, and the founders see
-- it on /internal/team next to the request.
--
-- People on the team list keep their name there; the dashboard shows that
-- one first. Run after 20261114160000_job_answers.sql. Safe to run again.

alter table public.internal_members
  add column if not exists name text not null default '';

alter table public.internal_members
  drop constraint if exists internal_members_name_length;
alter table public.internal_members
  add constraint internal_members_name_length check (char_length(name) <= 80);
