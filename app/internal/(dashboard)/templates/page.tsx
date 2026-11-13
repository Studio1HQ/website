import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowsClockwise, CalendarBlank, Lightning } from "@phosphor-icons/react/dist/ssr";
import {
  DEFAULT_CALL_URL,
  SAMPLE_VARS,
  TEMPLATE_GROUPS,
  fillTemplate,
  reasonFor,
  renderEmail,
  senderName,
  templatesFor,
  type FormKey,
} from "@/lib/internal/email-templates";
import { isMailerConfigured } from "@/lib/mailer";
import { TestSendButton } from "@/components/internal/test-send-button";
import { SECTIONS, sectionAccess, statusLabel } from "@/lib/internal/sections";
import { homeFor, requireMember } from "@/lib/internal/session";
import { cn } from "@/lib/utils";
import { Card, PageHeader, StatusBadge } from "@/components/internal/ui";

export const metadata: Metadata = { title: "Email templates" };

const PIPELINES: FormKey[] = ["jobs", "cohort", "hackathons"];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Every email the dashboard and the forms send, previewed with sample details. */
export default async function TemplatesPage({ searchParams }: Props) {
  const staff = await requireMember();
  // Only the pipelines this person works on: hiring staff see job and cohort
  // emails, community staff the hackathon ones.
  const pipelines = PIPELINES.filter((key) => sectionAccess(staff, SECTIONS[key]));
  if (!pipelines.length) redirect(homeFor(staff));
  const params = await searchParams;
  const pipeline = pipelines.find((key) => key === params.for) ?? pipelines[0];
  const items = templatesFor(pipeline);
  const selected = items.find((item) => item.key === params.t) ?? items[0];
  const vars = {
    ...SAMPLE_VARS[pipeline],
    sender: selected.automatic ? "The Studio1 team" : senderName(staff.email),
  };
  const { html } = renderEmail({
    body: fillTemplate(selected.body || "Hi {first_name},\n\n(Your message.)\n\n{sender}\nStudio1", vars),
    call: selected.call ? { label: "Book a call", url: DEFAULT_CALL_URL } : null,
    reason: reasonFor(pipeline, vars.program),
    unsubscribeUrl: "#",
    banner: { pipeline, template: selected.key },
    program: vars.program,
    assetBase: "",
  });
  const groups = ["Automatic", ...TEMPLATE_GROUPS];

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Email templates"
        description="What each email looks like, filled in with sample details. Send them from the Email button on any entry; everything stays editable before it goes."
      />

      <nav aria-label="Pipeline" className="mb-5 flex gap-1">
        {pipelines.map((key) => (
          <Link
            key={key}
            href={`/internal/templates?for=${key}`}
            aria-current={key === pipeline ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-lg px-3 text-[13px] transition-colors",
              key === pipeline
                ? "bg-[var(--i-panel)] font-medium shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)]"
                : "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
            )}
          >
            {SECTIONS[key].nav}
          </Link>
        ))}
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="p-2">
          {groups.map((group) => {
            const list = items.filter((item) => item.group === group);
            if (!list.length) return null;
            return (
              <div key={group} className="mb-1 last:mb-0">
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">
                  {group}
                </p>
                {list.map((item) => {
                  const active = item.key === selected.key;
                  return (
                    <Link
                      key={item.key}
                      href={`/internal/templates?for=${pipeline}&t=${item.key}`}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                        active ? "bg-[var(--i-ink)] font-medium text-[var(--i-panel)]" : "hover:bg-[var(--i-hover)]",
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.call ? (
                        <CalendarBlank size={14} className={active ? "opacity-80" : "text-[var(--i-faint)]"} aria-label="Has a Book a call button" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </Card>

        <Card>
          <div className="space-y-2 border-b border-[var(--i-line)] px-5 py-4">
            <p className="text-[12px] text-[var(--i-muted)]">Subject</p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-[15px] font-medium">{fillTemplate(selected.subject || "(You write the subject.)", vars)}</p>
              {sectionAccess(staff, SECTIONS[pipeline]) === "edit" ? (
                <TestSendButton pipeline={pipeline} template={selected.key} to={staff.email} ready={isMailerConfigured()} />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px] text-[var(--i-muted)]">
              {selected.automatic ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--i-sunken)] px-2 py-0.5 ring-1 ring-inset ring-[var(--i-line)]">
                  <Lightning size={12} /> Sent automatically when the form is submitted
                </span>
              ) : null}
              {selected.status ? (
                <span className="inline-flex items-center gap-1.5">
                  <ArrowsClockwise size={12} /> Offers to move the entry to <StatusBadge status={selected.status} />
                </span>
              ) : null}
              {selected.call ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarBlank size={12} /> Book a call button ({DEFAULT_CALL_URL.replace("https://", "")})
                </span>
              ) : null}
              {!selected.automatic && !selected.status && !selected.call ? <span>No status change</span> : null}
            </div>
          </div>
          <div className="bg-[var(--i-sunken)] p-4 sm:p-5">
            <iframe
              title={`Preview: ${selected.label}`}
              srcDoc={html}
              sandbox=""
              className="h-[900px] w-full rounded-xl border border-[var(--i-line)] bg-[#f4efe7]"
            />
          </div>
          {selected.status ? (
            <p className="px-5 pb-4 pt-3 text-[12px] text-[var(--i-faint)]">
              Sending it can also set the status to {statusLabel(selected.status)}, if you leave that box ticked.
            </p>
          ) : null}
        </Card>
      </div>
    </>
  );
}
