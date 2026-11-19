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

The team reads and reviews every form entry on the dashboard,
https://dashboard.studio1hq.com (`app/internal`; `proxy.ts` serves it at the
root of its own host, and old `www.studio1hq.com/internal/...` links redirect
there). Locally it's http://dashboard.localhost:3000 under `pnpm dev`. It has
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
2. Authentication → URL Configuration: Site URL `https://www.studio1hq.com`.
   Sign-in is an emailed code now, so no redirect URL is used (`/auth/callback`
   only sends old links to the login page).
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
set them on the dashboard's People page, where they can also invite people. Anyone
outside `@studio1hq.com` can only be invited, and only as a blog writer (the
table enforces it too).

Blog posts are written on the dashboard's Blog page (short link:
`www.studio1hq.com/blog/write`).
Drafts and their review history live in `blog_posts` and `blog_events`.
Images uploaded while drafting go to the private `blog-media` bucket as WebP.
Publishing commits the MDX file and its images to the site's GitHub repo
(`GITHUB_TOKEN`, see `.env.example`), and Vercel deploys it.

Comments work like Google Docs: select text in the editor and press Comment.
The thread keeps that text as its quote (`blog_events.quote`), the editor
highlights it, and threads take replies (`parent_id`) and can be resolved.

Access: Arindam and Amitesh (`lib/internal/roles.ts`) are owners and always
admins. Anyone else with a `@studio1hq.com` address who signs in is added to
`internal_members` as pending, and an admin approves them on the People page
as an Admin, Reviewer (status, tags, notes, emails) or Viewer (read only).

Applicant emails go out through Resend (`RESEND_API_KEY` in `.env.example`) in the paper
layout, with a "Book a call" button where it fits, and are logged in
`internal_email_log`. Every email links to `/unsubscribe`, which turns
`email_updates` off for that address; the subscribers CSV export includes
each person's unsubscribe link for the newsletter tool.

The review fields, views and saved queries the team uses are documented in the team's private docs, not in this public repo.

### Slack alerts

Each new job application, hackathon registration and DevRel Cohort
application posts to Slack: what they applied for, the city or country they
gave and a link into the dashboard. Never their name, email or answers. Make an incoming webhook (Slack
→ Apps → Incoming Webhooks → Add to a channel) and set `SLACK_WEBHOOK_URL`;
`SLACK_WEBHOOK_URL_JOBS`, `_HACKATHONS` and `_COHORT` send a form to its own
channel.

### Blog numbers

Blog → Stats (`dashboard.studio1hq.com/blog/stats`, blog reviewers) shows views, readers
and read time from Google Analytics, and clicks, impressions and top
searches from Search Console. The Blog page's Live tab also shows each
post's Google Search clicks. Both read as one Google service account
(`lib/internal/google.ts`); nobody signs in to Google.

The service account already exists: `search-console-reader@studio1-dashboard.iam.gserviceaccount.com`
in the Google Cloud project `studio1-dashboard`, with the Google Search
Console API on, added to the studio1hq.com property as Restricted. To
connect it:

1. Under the service account's Keys, add a JSON key and download it.
2. In Vercel, set `GSC_CLIENT_EMAIL` (the service account email) and
   `GSC_PRIVATE_KEY` (the JSON file's `private_key`), both Production and
   Sensitive. The property is a domain one, so `GSC_SITE_URL` stays unset
   (a URL-prefix property would need `https://www.studio1hq.com/`).
3. For views (`lib/internal/google-analytics.ts`): turn on the "Google
   Analytics Data API" in the same Google Cloud project; in Google
   Analytics → Admin → Property access management, add the service
   account's email as a Viewer; and set `GA_PROPERTY_ID` in Vercel to the
   property's number (Admin → Property details).
4. Redeploy, then delete the downloaded key file.

Google Analytics only has numbers from 18 Nov 2026, when the site started
sending them.
