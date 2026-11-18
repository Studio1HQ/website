-- Outreach research: what a prospect list carries before anyone reaches
-- out (app/internal/(dashboard)/outreach). Fills the columns of the team's
-- prospect sheets, so a researched lead keeps its reason, its way in and
-- any clash with a client:
--
--   priority    high, medium or low; '' when not set
--   about       what the company does, in a few words
--   funding     its last round, as written ("Seed $6M (Bessemer), Sep 2026")
--   why_fit     the dated signal that makes now a good time
--   warm_path   the best way in: a past interaction, a shared event, or the
--               most realistic cold route
--   signal_url  the post or page behind why_fit
--   conflict    '' or the client it's close to ("Possible: Motia"): check
--               with that client before reaching out
--
-- Needs the outreach migration (20261117100000_outreach.sql). Adds columns
-- only, so the pages already live keep working. Safe to run again.

alter table public.outreach_orgs
  add column if not exists priority text not null default ''
    check (priority in ('', 'high', 'medium', 'low')),
  add column if not exists about text not null default '',
  add column if not exists funding text not null default '',
  add column if not exists why_fit text not null default '',
  add column if not exists warm_path text not null default '',
  add column if not exists signal_url text,
  add column if not exists conflict text not null default '';

notify pgrst, 'reload schema';
