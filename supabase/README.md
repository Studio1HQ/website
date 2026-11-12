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

## Internal dashboard

The team reads and reviews every form entry at `/internal` (`app/internal`):
an overview, one page per table (Jobs, Hackathons, DevRel Cohort), the
`email_subscribers` and `partner_referral_pool` views, CSV export, and a
status and notes form on each entry (it records who changed it in
`reviewed_by`). Résumés open through two-minute signed links.

Sign-in is a Supabase Auth magic link (PKCE), for `@studio1hq.com`
addresses and outside blog writers an admin invited. The site checks the address, creates the Auth user with the
admin API if needed, and the link only works in the browser that asked for
it. Setup:

1. Run `migrations/*_internal_dashboard.sql`, `migrations/*_internal_team.sql`,
   `migrations/*_blog_and_roles.sql`, `migrations/*_email_delivery.sql` and
   `migrations/*_blog_threads_and_schedule.sql`, in that order.
2. Authentication → URL Configuration: set Site URL to
   `https://www.studio1hq.com` and add these Redirect URLs:
   `https://www.studio1hq.com/internal/auth/callback` and, for local
   testing, `http://localhost:3000/internal/auth/callback`.
3. Email: Supabase's built-in sender only mails members of the Supabase
   organization's team, 2 emails an hour. Either add each teammate under
   Organization → Team, or use Resend for sign-in emails too
   (Authentication → Emails → SMTP Settings: host `smtp.resend.com`, port
   465, username `resend`, password your Resend API key).
4. Recommended: turn off "Allow new users to sign up" (Authentication →
   Sign In / Providers), so only the site's server can add users.
5. Optional: edit the Magic Link email template (Authentication → Emails).

### Roles and the blog

People can hold several roles (`internal_members.roles`): `admin`,
`hiring_reviewer`, `hiring_viewer`, `blog_reviewer` and `blog_writer`. Admins
set them on `/internal/team`, where they can also invite people. Anyone
outside `@studio1hq.com` can only be invited, and only as a blog writer (the
table enforces it too).

Blog posts are written at `/internal/blog` (short link: `/blog/write`).
Drafts and their review history live in `blog_posts` and `blog_events`.
Images uploaded while drafting go to the private `blog-media` bucket as WebP.
Publishing commits the MDX file and its images to the site's GitHub repo
(`GITHUB_TOKEN`, see `.env.example`), and Vercel deploys it.

Comments work like Google Docs: select text in the editor and press Comment.
The thread keeps that text as its quote (`blog_events.quote`), the editor
highlights it, and threads take replies (`parent_id`) and can be resolved.

Access: Arindam and Amitesh (`lib/internal/roles.ts`) are owners and always
admins. Anyone else with a `@studio1hq.com` address who signs in is added to
`internal_members` as pending, and an admin approves them on `/internal/team`
as an Admin, Reviewer (status, tags, notes, emails) or Viewer (read only).

Applicant emails go out through Resend (`RESEND_API_KEY` in `.env.example`) in the paper
layout, with a "Book a call" button where it fits, and are logged in
`internal_email_log`. Every email links to `/unsubscribe`, which turns
`email_updates` off for that address; the subscribers CSV export includes
each person's unsubscribe link for the newsletter tool.

The review fields, views and saved queries the team uses are documented in the team's private docs, not in this public repo.
