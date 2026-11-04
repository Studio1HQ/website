# Supabase: form data

Every form on the site saves to its own table. The site writes through its API
routes with the service-role key (`lib/supabase-server.ts`); the public anon
key can't read or write anything here.

| Form | Page | Table | API route |
| --- | --- | --- | --- |
| Hackathon registration | `/hackathons/[slug]` | `hackathon_registrations` | `app/api/hackathons/register` |
| Job application (hiring) | `/careers/[id]` | `job_applications` (+ résumé PDFs in the private `job-applications` bucket) | `app/api/careers/apply` |
| DevRel Cohort application | `/devrel-cohort` | `devrel_cohort_applications` | `app/api/devrel-cohort/apply` |

The other "contact us" points on the site are `mailto:` links and store nothing.

## Setup

1. Create a Supabase project.
2. In the SQL editor, run the files in `migrations/` in name order (or run
   `supabase db push`). They're safe to run again. The last one,
   `*_api_grants.sql`, matters on newer projects: with "Automatically expose
   new tables" off (the default, and the safer choice), new tables have no
   grants, and the site's inserts fail with "permission denied" until it runs.
   Leave the tables unexposed under Data API → Exposed tables; the site only
   uses the server key.
3. Set `SUPABASE_URL` (Project URL, `https://<ref>.supabase.co`) and
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API Keys → a secret key,
   `sb_secret_...`) in the hosting environment, and in `.env.local` to save
   entries locally. Never prefix them with `NEXT_PUBLIC_`.

The live project is "Studio1HQ's Project" (ref `feadlrocjrmivnhimnzb`,
Mumbai, Free plan). All five migrations have been run on it.

## Fields the team edits

All three tables share these. The site never writes them after the first
insert, so edit them in the table editor.

- `review_status`: where the entry stands (values below).
- `review_notes`: free text for the team.
- `updated_at`: set automatically whenever a row changes.

| Table | `review_status` values (default `new`) |
| --- | --- |
| `hackathon_registrations` | `new`, `confirmed`, `waitlisted`, `rejected`, `attended`, `no_show`, `withdrawn` |
| `job_applications` | `new`, `reviewing`, `shortlisted`, `interviewing`, `offer`, `hired`, `rejected`, `withdrawn` |
| `devrel_cohort_applications` | `new`, `reviewing`, `shortlisted`, `accepted`, `waitlisted`, `rejected` |

Every form ends with the same consent block (`lib/contact-consent.ts`),
saved on all three tables:

- `contact_consent`: the required tick, "Studio1 can store the details I've
  shared and email me about this application and next steps". Always true,
  because the API refuses entries without it.
- `email_updates`: the optional opt-in to emails about future roles, cohorts
  and events. Email someone beyond their own application only when it's true.

The cohort table also has two fields for after the program:

- `outcome`: the furthest stage reached: `completed`, `dropped`, `interviewed`
  or `hired`.
- `referred_to`: the partner companies this person was referred to.

## Views

These are read-only and show up next to the tables in the table editor.

- `submissions`: every entry from every form, one row each, with `form`
  (`hackathon`, `job`, `devrel_cohort`), `program`, `name`, `email`,
  `location`, `role`, `review_status`, `partner_consent` and the dates. Filter
  by email to see everything one person has applied to.
- `email_subscribers`: everyone who opted in to future emails on any form,
  one row per email, with their latest name and which forms they used.
  Export it as CSV for your email tool, and handle unsubscribes there.
- `partner_referral_pool`: cohort applicants and hackathon registrants who
  ticked "Studio1 can share my application with partner companies". Refer
  only people in this view. (The job form doesn't ask, so job applicants
  aren't in it.)

## Filtering

In the table editor: open a table or view, then use **Filter** and **Sort**.
**Export → CSV** downloads what's on screen. For saved queries, paste these
into the SQL editor:

```sql
-- Cohort shortlist, newest first
select name, email, location, role, profile_url, work_url, why_devrel
from devrel_cohort_applications
where cohort = 'Cohort 01' and review_status = 'shortlisted'
order by created_at desc;

-- Hiring pipeline for one role, counted by stage
select review_status, count(*)
from job_applications
where job_id = 'devrel-engineer'
group by review_status;

-- Everyone at a hackathon who showed up
select name, email, github, track, team_name
from hackathon_registrations
where hackathon_slug = 'your-hackathon' and review_status = 'attended';

-- People who applied through more than one form
select email, array_agg(form || ': ' || program) as applied_to
from submissions
group by email
having count(*) > 1;

-- Cohort graduates you can refer to partners
select name, email, profile, work, referred_to
from partner_referral_pool
where form = 'devrel_cohort' and outcome in ('completed', 'interviewed');
```
