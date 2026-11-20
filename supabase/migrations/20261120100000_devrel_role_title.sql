-- The DevRel Engineer role is now titled "Developer Relations Engineer"
-- (content/careers/jobs/en/devrel-engineer.md). Its id, devrel-engineer,
-- is unchanged. Each application keeps the title the role had when the
-- person applied, so without this the dashboard's Jobs list shows the same
-- role under two names, and searching the new name misses older rows.
--
-- Only the title changes. Saved answers keep the question wording each
-- applicant saw (the form's questions changed too), and nothing in the
-- table's shape changes: the new why-devrel question lands in the existing
-- answers column.
--
-- updated_at is the clock for clearing rejected applications
-- (lib/internal/retention.ts), so its trigger is off for the rename: a
-- rejected applicant's 15 days don't start again. The table stays locked
-- until commit, so no other edit slips through unstamped.
--
-- Safe to run again: a second run finds nothing to rename.

begin;

alter table public.job_applications
  disable trigger job_applications_updated_at;

update public.job_applications
set job_title = 'Developer Relations Engineer'
where job_id = 'devrel-engineer'
  and job_title is distinct from 'Developer Relations Engineer';

alter table public.job_applications
  enable trigger job_applications_updated_at;

commit;
