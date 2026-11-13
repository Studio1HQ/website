import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowSquareOut, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { HACKATHONS } from "@/data/hackathons";
import { loadEvents } from "@/lib/internal/community/data";
import { formatEventDate, todayKey } from "@/lib/internal/community/schema";
import { SECTIONS } from "@/lib/internal/sections";
import { requireSection } from "@/lib/internal/session";
import { Card, CardTitle, PageHeader, buttonClass } from "@/components/internal/ui";

export const metadata: Metadata = { title: "Add a hackathon" };

/** Fields every hackathon's registration form asks, before its own questions. */
const STANDARD_FIELDS = [
  "Full name, email and GitHub username",
  "Country, role and experience",
  "Solo or team (and the team's name)",
  "Track",
  "How they heard about it and what they want to build",
  "Agreeing to the rules",
  "Sharing their details with the hackathon's partners (optional)",
  "The two consent ticks every Studio1 form has",
];

/**
 * The community manager's guide to adding a hackathon. Hackathons live in
 * code (data/hackathons.ts): the manager asks for one with a GitHub issue
 * form, a developer builds the page from it, and the manager runs it from
 * the dashboard. Also lists the real hackathons on the site and whether
 * each is linked to a Community event.
 */
export default async function HackathonSetupPage() {
  await requireSection(SECTIONS.hackathons);
  const events = await loadEvents();
  const repo = process.env.GITHUB_REPO?.trim() || "Studio1HQ/website";
  const newIssue = `https://github.com/${repo}/issues/new?template=new-hackathon.yml`;
  const changeIssue = `https://github.com/${repo}/issues/new?template=hackathon-change.yml`;
  const today = todayKey();

  const linked = new Map<string, string>();
  for (const event of events.ok ? events.rows : []) {
    if (event.hackathon_slug && !linked.has(event.hackathon_slug)) linked.set(event.hackathon_slug, event.id);
  }
  const real = HACKATHONS.filter((hackathon) => !hackathon.placeholder).sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <Link href={SECTIONS.hackathons.path} className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]">
            <ArrowLeft size={12} aria-hidden /> Hackathon sign-ups
          </Link>
        }
        title="Add a hackathon"
        description="Every hackathon gets its own page and registration form on studio1hq.com. You send the details in a GitHub issue, and a developer builds the page from it."
        actions={
          <>
            <IssueLink href={changeIssue} variant="secondary">
              Change a hackathon
            </IssueLink>
            <IssueLink href={newIssue} variant="accent">
              New hackathon
            </IssueLink>
          </>
        }
      />

      <div className="space-y-5">
        <Card>
          <CardTitle>How it works</CardTitle>
          <ol className="divide-y divide-[var(--i-line)]">
            <Step n={1} title="Agree the details">
              Name, dates (one day or several), online or in person, team size, prizes, tracks, the sponsors who have
              agreed to be named, and any sponsor tasks or extra questions. Sponsorship amounts and contacts go in{" "}
              <Link href="/internal/community/sponsors" className="underline underline-offset-2">
                Community → Sponsors
              </Link>
              , not in the issue.
            </Step>
            <Step n={2} title="Open a New hackathon issue">
              The form on GitHub asks for everything the page needs. You need a free GitHub account. The issue is
              public, so write only what will appear on the page.
            </Step>
            <Step n={3} title="Check the preview">
              A developer builds the page and comments a preview link on the issue. Check the page, the form and the
              tasks, and ask for fixes in the same issue. Until the hackathons section launches, the page only opens for
              people who have its link.
            </Step>
            <Step n={4} title="Link it in Community">
              Add an event in{" "}
              <Link href="/internal/community/events" className="underline underline-offset-2">
                Community → Events
              </Link>{" "}
              with the type Hackathon, and pick the hackathon under &ldquo;Registrations from the site form&rdquo;. Its
              sign-ups then show in the event&apos;s door list, turnout and sponsor report.
            </Step>
            <Step n={5} title="Run it from Hackathon sign-ups">
              Its tab has the registrations to review and an email plan: five emails, each dated from the start and end
              dates, which you write from a template and send.
            </Step>
            <Step n={6} title="Changes later">
              Open a Change a hackathon issue for new dates, a sponsor&apos;s extra task, a new question or anything
              else.
            </Step>
          </ol>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle>The registration form</CardTitle>
            <div className="space-y-3 px-5 py-4 text-[13px] leading-relaxed">
              <p className="text-[var(--i-muted)]">Every hackathon&apos;s form asks for:</p>
              <ul className="list-disc space-y-1 pl-5">
                {STANDARD_FIELDS.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
              <p className="text-[var(--i-muted)]">
                Each hackathon can add its own questions: a short answer, a paragraph, a choice or yes/no, each required
                or optional. Answers show on every registration and in the CSV, and choice and yes/no answers become
                breakdowns in the sponsor report.
              </p>
            </div>
          </Card>

          <Card>
            <CardTitle>Sponsor tasks</CardTitle>
            <div className="space-y-3 px-5 py-4 text-[13px] leading-relaxed">
              <p>
                Tasks show on the page as a checklist: join the Discord, follow Studio1, run the partner quickstart, plus
                any a sponsor asks for, such as starring their repo or making an account.
              </p>
              <p className="text-[var(--i-muted)]">
                People tick tasks off in their own browser, so we can&apos;t see the ticks. When a sponsor needs to know
                who did a task, ask for proof in the issue (a link or a username). It becomes a question on the form, so
                you see it on each registration and in the CSV.
              </p>
            </div>
          </Card>
        </div>

        <Card>
          <CardTitle>Good to know before asking for a change</CardTitle>
          <ul className="list-disc space-y-1.5 px-5 py-4 pl-10 text-[13px] leading-relaxed">
            <li>People who have already registered aren&apos;t asked new questions. Email them from the dashboard.</li>
            <li>
              A question people have answered can&apos;t be removed or renamed, or the answers would stop matching. Ask for
              a new question instead.
            </li>
            <li>New dates also move the suggested days in the email plan.</li>
            <li>The page&apos;s address comes from the name and stays the same once people register.</li>
          </ul>
        </Card>

        <Card>
          <CardTitle>On the site</CardTitle>
          {real.length ? (
            <ul className="divide-y divide-[var(--i-line)]">
              {real.map((hackathon) => {
                const eventId = linked.get(hackathon.slug);
                return (
                  <li key={hackathon.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{hackathon.name}</p>
                      <p className="text-[12.5px] text-[var(--i-muted)]">
                        {formatEventDate(hackathon.startDate, hackathon.endDate, today)}
                        {hackathon.registerUrl ? " · registers elsewhere" : ""}
                      </p>
                    </div>
                    <a
                      href={`/hackathons/${hackathon.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClass("ghost", "sm")}
                    >
                      Page <ArrowSquareOut size={12} aria-hidden />
                    </a>
                    {eventId ? (
                      <Link href={`/internal/community/events/${eventId}`} className={buttonClass("secondary", "sm")}>
                        Event page <ArrowRight size={12} aria-hidden />
                      </Link>
                    ) : (
                      <span className="text-[12px] text-amber-700 dark:text-amber-300">Not linked in Community yet</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-4 text-[13px] leading-relaxed text-[var(--i-muted)]">
              No real hackathons yet. The ones on the site now (Docs Sprint, Agents in Production and others) are
              samples: they&apos;re hidden here and are removed when the first real one is added.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 px-5 py-4">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--i-sunken)] text-[12px] font-medium tabular-nums text-[var(--i-muted)] ring-1 ring-[var(--i-line)]">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--i-ink-2)]">{children}</p>
      </div>
    </li>
  );
}

function IssueLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "accent" | "secondary";
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant)}>
      <GithubLogo size={14} aria-hidden /> {children}
    </a>
  );
}
