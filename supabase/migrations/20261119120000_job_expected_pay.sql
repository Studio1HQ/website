-- The pay an applicant expects, asked on every role's application form.
-- Whole rupees, per expected_pay_per: "month" for most roles, "article" for
-- roles paid per article (`pay: article` in the brief, content/careers/jobs).
-- The basis is saved with each application, so an old figure still reads
-- right if a role's basis changes later. Older applications have neither.
--
-- Pay is money: the dashboard shows it to the founders only and leaves it
-- out of other people's CSV exports.
--
-- Until this runs, applications still save: the pay is written under "why"
-- instead (and logged). Safe to run again.

alter table public.job_applications
  add column if not exists expected_pay_inr integer,
  add column if not exists expected_pay_per text;

alter table public.job_applications
  drop constraint if exists job_applications_expected_pay;

alter table public.job_applications
  add constraint job_applications_expected_pay check (
    (expected_pay_inr is null and expected_pay_per is null)
    or (
      expected_pay_inr > 0
      and expected_pay_per in ('month', 'article')
    )
  );
