import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { getHackathon } from "@/data/hackathons";
import Logo from "@/components/ui/svgs/logo";
import { hackathonRegistrationsFor } from "@/lib/internal/data";
import { SECTIONS, canExportSection } from "@/lib/internal/sections";
import { requireCommunity } from "@/lib/internal/session";
import { isUuid } from "@/lib/internal/community/clean";
import {
  getRecord,
  loadEventPartners,
  loadGuests,
  loadPartners,
  loadSponsors,
  loadSponsorships,
} from "@/lib/internal/community/data";
import { eventReport, type ReportRegistration } from "@/lib/internal/community/report";
import {
  EVENT_FORMATS,
  EVENT_KINDS,
  EVENT_PARTNER_ROLES,
  formatDay,
  formatEventDate,
  labelOf,
  percent,
  todayKey,
  type CommunityEvent,
  type Sponsor,
} from "@/lib/internal/community/schema";
import { phaseOf } from "@/lib/internal/community/stats";
import { BarList, ColumnChart, TableView } from "@/components/internal/community/charts";
import { PrintButton } from "@/components/internal/community/print-button";
import { MigrationNotice, Stat } from "@/components/internal/community/ui";
import { Card, CardTitle, buttonClass } from "@/components/internal/ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // The title is data too: check the role before reading the record.
  const [, { id }] = await Promise.all([requireCommunity(), params]);
  const event = await getRecord<CommunityEvent>("event", id);
  return { title: event ? `${event.name}: report` : "Event report" };
}

/**
 * One event's report for its sponsors and partners: turnout, who signed
 * up, how sign-ups came in, and who it was run with. Print it or save it as
 * a PDF from the browser; `?sponsor=<id>` puts the sponsor's name on it.
 * No money and no personal details: the CSV of people who agreed to
 * partner referrals is a separate download for managers.
 */
export default async function EventReportPage({ params, searchParams }: Props) {
  const [staff, { id }, query] = await Promise.all([requireCommunity(), params, searchParams]);
  const event = await getRecord<CommunityEvent>("event", id);
  if (!event) notFound();
  const today = todayKey();
  const sponsorId = typeof query.sponsor === "string" && isUuid(query.sponsor) ? query.sponsor : null;

  const [guests, siteRows, links, partners, sponsorships, sponsors, sponsor] = await Promise.all([
    loadGuests(event.id),
    event.hackathon_slug ? hackathonRegistrationsFor(event.hackathon_slug) : Promise.resolve(null),
    loadEventPartners({ event_id: event.id }),
    loadPartners(),
    loadSponsorships({ event_id: event.id }),
    loadSponsors(),
    sponsorId ? getRecord<Sponsor>("sponsor", sponsorId) : Promise.resolve(null),
  ]);
  if (!guests.ok) return <MigrationNotice message={guests.message} />;

  const hackathon = event.hackathon_slug ? getHackathon(event.hackathon_slug) : undefined;
  const registrations: ReportRegistration[] = siteRows?.ok
    ? siteRows.rows.map((row) => ({
        id: String(row.id),
        created_at: String(row.created_at ?? ""),
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        github: String(row.github ?? ""),
        team: String(row.team ?? ""),
        team_name: String(row.team_name ?? ""),
        track: String(row.track ?? ""),
        review_status: String(row.review_status ?? "new"),
        country: String(row.country ?? ""),
        role: String(row.role ?? ""),
        experience: String(row.experience ?? ""),
        partner_consent: row.partner_consent === true,
        answers: row.answers,
      }))
    : [];
  const over = phaseOf(event, today) === "past";
  const report = eventReport({ guests: guests.rows, registrations, questions: hackathon?.questions, over });

  const partnerNames = new Map((partners.ok ? partners.rows : []).map((item) => [item.id, item.name]));
  const host = event.partner_id ? partnerNames.get(event.partner_id) : undefined;
  const sponsorNames = new Map((sponsors.ok ? sponsors.rows : []).map((item) => [item.id, item.name]));
  const sponsoredBy = [
    ...new Set(
      (sponsorships.ok ? sponsorships.rows : [])
        .filter((deal) => deal.status !== "cancelled")
        .map((deal) => sponsorNames.get(deal.sponsor_id))
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const where = event.format === "online" ? "Online" : [event.venue, event.city].filter(Boolean).join(", ");
  const canDownload =
    staff.community === "manager" && Boolean(event.hackathon_slug) && canExportSection(staff, SECTIONS.hackathons);
  const turnoutKnown = report.counts.signed_up > 0;

  return (
    <article className="mx-auto max-w-[960px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/internal/community/events/${event.id}`}
          className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
        >
          <ArrowLeft size={13} /> {event.name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canDownload && report.partnerOptIns > 0 ? (
            <a
              href={`/internal/community/events/${event.id}/report/partner-referrals`}
              className={buttonClass("secondary", "sm")}
            >
              <DownloadSimple size={13} /> Partner referrals CSV
            </a>
          ) : null}
          <PrintButton />
        </div>
      </div>

      <header className="mb-6 border-b border-[var(--i-line)] pb-5">
        <p className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--i-muted)]">
          <Logo className="size-5" /> Studio1 · Event report
        </p>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.015em]">{event.name}</h1>
        <p className="mt-1.5 text-[13.5px] text-[var(--i-muted)]">
          {[
            formatEventDate(event.starts_on, event.ends_on, today),
            labelOf(EVENT_KINDS, event.kind),
            where || labelOf(EVENT_FORMATS, event.format),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1 text-[12.5px] text-[var(--i-faint)]">
          {sponsor ? (
            <>
              Prepared for <span className="font-medium text-[var(--i-ink-2)]">{sponsor.name}</span> ·{" "}
            </>
          ) : null}
          Numbers as of {formatDay(today, "")}
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Signed up" value={turnoutKnown ? report.counts.signed_up.toLocaleString("en-IN") : "—"} />
        <Stat
          label="Attended"
          value={report.counts.attended ? report.counts.attended.toLocaleString("en-IN") : "—"}
          note={over ? undefined : "After the event"}
          accent={report.counts.attended > 0}
        />
        <Stat
          label="Showed up"
          value={report.showUp !== null ? percent(report.showUp) : "—"}
          note="Of everyone accepted"
        />
        {registrations.length ? (
          <Stat
            label="Countries"
            value={report.countries.toLocaleString("en-IN")}
            note={report.teams ? `${report.teams} named teams` : undefined}
          />
        ) : (
          <Stat label="Speakers, mentors and judges" value={report.crew.reduce((sum, item) => sum + item.count, 0)} />
        )}
      </div>

      {report.signups.length > 1 ? (
        <Card className="mb-5 break-inside-avoid">
          <CardTitle>Sign-ups on the site, by {report.signupsBy}</CardTitle>
          <div className="px-5 py-4">
            <ColumnChart
              groups={report.signups.map((item) => ({ key: item.key, label: item.label, values: [item.value] }))}
              series={["Sign-ups"]}
            />
            <TableView
              head={[report.signupsBy === "week" ? "Week" : "Day", "Sign-ups"]}
              rows={report.signups.map((item) => [item.label, item.value])}
            />
          </div>
        </Card>
      ) : null}

      {report.breakdowns.length ? (
        <div className="mb-5 grid gap-5 md:grid-cols-2 print:grid-cols-2">
          {report.breakdowns.map((breakdown) => (
            <Card key={breakdown.key} className="break-inside-avoid">
              <CardTitle>{breakdown.title}</CardTitle>
              <div className="px-5 py-4">
                <BarList
                  rows={breakdown.rows.map((row) => ({
                    key: row.label,
                    label: row.label,
                    value: row.count,
                    figure: row.count.toLocaleString("en-IN"),
                    note: percent(row.count / Math.max(1, breakdown.total)),
                  }))}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="mb-5 grid gap-5 md:grid-cols-2 print:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardTitle>Run with</CardTitle>
          <ul className="divide-y divide-[var(--i-line)] text-[13px]">
            {host ? (
              <li className="flex justify-between gap-3 px-5 py-2.5">
                <span className="font-medium">{host}</span>
                <span className="text-[var(--i-muted)]">Host</span>
              </li>
            ) : null}
            {(links.ok ? links.rows : []).map((link) => (
              <li key={link.id} className="flex justify-between gap-3 px-5 py-2.5">
                <span className="font-medium">{partnerNames.get(link.partner_id) ?? "A partner"}</span>
                <span className="text-[var(--i-muted)]">{labelOf(EVENT_PARTNER_ROLES, link.role)}</span>
              </li>
            ))}
            {sponsoredBy.map((name) => (
              <li key={`s-${name}`} className="flex justify-between gap-3 px-5 py-2.5">
                <span className="font-medium">{name}</span>
                <span className="text-[var(--i-muted)]">Sponsor</span>
              </li>
            ))}
            {report.crew.map((item) => (
              <li key={`c-${item.label}`} className="flex justify-between gap-3 px-5 py-2.5">
                <span className="font-medium">{item.label}</span>
                <span className="tabular-nums text-[var(--i-muted)]">{item.count}</span>
              </li>
            ))}
            {!host && !(links.ok && links.rows.length) && !sponsoredBy.length && !report.crew.length ? (
              <li className="px-5 py-4 text-[var(--i-muted)]">No partners or sponsors on this event yet.</li>
            ) : null}
          </ul>
        </Card>
        {registrations.length ? (
          <Card className="break-inside-avoid">
            <CardTitle>Partner referrals</CardTitle>
            <div className="px-5 py-4 text-[13px] leading-relaxed">
              <p className="text-[22px] font-medium tabular-nums">
                {report.partnerOptIns.toLocaleString("en-IN")}{" "}
                <span className="text-[13px] font-normal text-[var(--i-muted)]">
                  of {report.registered.toLocaleString("en-IN")} (
                  {percent(report.partnerOptIns / Math.max(1, report.registered))})
                </span>
              </p>
              <p className="mt-2 text-[var(--i-muted)]">
                agreed to share their details with this hackathon&apos;s partners so they can contact them about their
                products.
              </p>
            </div>
          </Card>
        ) : null}
      </div>

      <p className="text-[12px] leading-relaxed text-[var(--i-faint)]">
        Everyone is counted once across the guest list and the site registrations. Rejected and withdrawn registrations
        are left out; the breakdowns cover site registrations only.
        {siteRows && !siteRows.ok ? " The site registrations didn't load, so they're missing from this report." : ""}
      </p>
    </article>
  );
}
