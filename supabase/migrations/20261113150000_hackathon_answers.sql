-- Answers to a hackathon's own registration questions (the `questions` on
-- each event in data/hackathons.ts). /api/hackathons/register saves them as
-- [{ "id": "...", "question": "...", "answer": "..." }], with the question's
-- wording at the time, so old answers still read right if it changes.
--
-- Until this runs, registrations still save; only the answers are skipped
-- (and logged). Safe to run again.

alter table public.hackathon_registrations
  add column if not exists answers jsonb not null default '[]'::jsonb;

alter table public.hackathon_registrations
  drop constraint if exists hackathon_registrations_answers_array;

alter table public.hackathon_registrations
  add constraint hackathon_registrations_answers_array
  check (jsonb_typeof(answers) = 'array');
