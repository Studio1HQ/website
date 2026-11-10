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

The review fields, views and saved queries the team uses are documented in the team's private docs, not in this public repo.
