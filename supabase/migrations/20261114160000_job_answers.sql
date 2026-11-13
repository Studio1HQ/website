-- Answers to a job role's own application questions (the `questions` in
-- each brief's frontmatter, content/careers/jobs). /api/careers/apply saves
-- them as [{ "id": "...", "question": "...", "answer": "..." }], with the
-- question's wording at the time, so old answers still read right if it
-- changes. A role with its own questions doesn't ask for the generic plan
-- link, so that column can be empty.
--
-- Until this runs, applications still save: the answers are written under
-- "why" instead (and logged). Safe to run again.

alter table public.job_applications
  add column if not exists answers jsonb not null default '[]'::jsonb;

alter table public.job_applications
  drop constraint if exists job_applications_answers_array;

alter table public.job_applications
  add constraint job_applications_answers_array
  check (jsonb_typeof(answers) = 'array');

alter table public.job_applications
  alter column plan_link drop not null;
