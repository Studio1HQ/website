# Supabase: form data

Every form on the site saves to its own table. The site writes through its API
routes with the service-role key (`lib/supabase-server.ts`); the public anon
key can't read or write anything here.

| Form | Page | Table | API route |
| --- | --- | --- | --- |
| Hackathon registration | `/hackathons/[slug]` | `hackathon_registrations` | `app/api/hackathons/register` |
| Job application (hiring) | `/careers/[id]` | `job_applications` (+ résumé PDFs in the private `job-applications` bucket) | `app/api/careers/apply` |
| DevRel Cohort application | `/devrel-cohort` | `devrel_cohort_applications` | `app/api/devrel-cohort/apply` |
| Studio1 Across the Campus application (community support) | `/community/campus` | `campus_applications` | `app/api/community/campus` |

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

The dashboard's Blog is a section of its own: Overview (this month's
numbers, top and moving posts, the review pipeline), Posts (drafts, review
and live posts; short link `www.studio1hq.com/blog/write`), Stats (every
post, and a page per post) and External (copies on DEV). Writers only see
Posts.
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

Each new job application, hackathon registration, DevRel Cohort
application and campus application posts to Slack: what they applied for, the city or country they
gave and a link into the dashboard. Never their name, email or answers. Make an incoming webhook (Slack
→ Apps → Incoming Webhooks → Add to a channel) and set `SLACK_WEBHOOK_URL`;
`SLACK_WEBHOOK_URL_JOBS`, `_HACKATHONS`, `_COHORT` and `_CAMPUS` send a form to
its own channel.

### Blog numbers

Blog → Overview and Blog → Stats (`dashboard.studio1hq.com/blog`,
`/blog/stats` and `/blog/stats/<slug>`, blog reviewers) show views, readers,
read time, sources and countries from Google Analytics, and clicks,
impressions, positions and searches from Search Console. Posts → Live also
shows each post's 28-day views and Google clicks. Both read as one Google
service account (`lib/internal/google.ts`); nobody signs in to Google.

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

### Blog → External (DEV)

`/blog/external` (blog reviewers) shows the team's DEV (dev.to) account like
DEV's own dashboard: reactions, comments and views per article, with the
copies of Studio1 posts marked (matched by canonical URL). A reviewer can
send a live post to DEV as an unpublished draft whose canonical URL is
`https://www.studio1hq.com/blog/<slug>`; it checks DEV first, so a post is
never copied twice. Drafts stay private until someone publishes them on DEV.
Code: `lib/internal/blog/devto.ts` (conversion, tested) and `devto-api.ts`.

1. Sign in to DEV as the account the copies should live on, open Settings →
   Extensions → "DEV Community API Keys" and generate a key.
2. In Vercel, add it as `DEV_API_KEY` (Production, Sensitive) and redeploy.
3. Optional: to make drafts under a DEV organization, also set
   `DEV_ORGANIZATION_ID`, the `id` from
   `https://dev.to/api/organizations/<org-username>`. The key's account must
   be a member.

The article list is kept for 10 minutes and refreshed after every send.

### Blog → Stats → DEV

`/blog/stats/dev` (blog reviewers; the DEV tab on Stats) shows the Studio1
organization on DEV (dev.to/studio1hq) from DEV's own analytics: views,
reactions, comments and new followers over the range against the stretch
before, all-time totals, views and reactions a day, every post with its
views (in the range and all time), reactions and comments, writers, the
sites readers come from and the readers who engage most. A post's own stats
page shows its DEV copy's numbers from here too. Code:
`lib/internal/blog/devto-stats.ts` (reading DEV's answers, tested) and
`devto-stats-api.ts` (GET requests only).

It reads with its own key, `DEV_STATS_API_KEY`, separate from
`DEV_API_KEY`: DEV keys can't be limited to reading, so the stats key is
never used by anything that publishes, and it can belong to a personal
account. Its account must be a member of the organization.

1. Signed in to DEV as a member of dev.to/studio1hq, open Settings →
   Extensions → "DEV Community API Keys" and generate a key (name it
   something like "Studio1 dashboard stats").
2. In Vercel, add it as `DEV_STATS_API_KEY` (Production, Sensitive) and
   redeploy. For local dev, put it in `.env.local`.

Numbers are kept for an hour (a page makes at most five requests; DEV allows
about 40 a minute per key). Per-post views come from DEV's organization
article analytics, which DEV turns on per organization; without it the posts
show reactions and comments only and the page says so.
