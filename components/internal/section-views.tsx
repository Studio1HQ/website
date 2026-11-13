import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import { ROW_LIMIT, entryExtras, listView, recordView } from "@/lib/internal/data";
import { AUTOMATIC_SENDER, senderName } from "@/lib/internal/email-templates";
import { programOf } from "@/lib/internal/program";
import { blockedReason } from "@/lib/email-delivery";
import { isMailerConfigured } from "@/lib/mailer";
import { firstName } from "@/lib/first-name";
import { mailtoHref } from "@/lib/form-checks";
import { requireSection } from "@/lib/internal/session";
import { rowTags } from "@/lib/internal/query";
import {
  SECTIONS,
  PAGE_SIZE,
  canExportSection,
  filterParams,
  parseFilters,
  withQuery,
  type SectionKey,
} from "@/lib/internal/sections";
import { EmailComposer } from "@/components/internal/email-composer";
import { CancelScheduledButton, DeliveryChip } from "@/components/internal/email-delivery";
import { ListView } from "@/components/internal/list-view";
import { RecordKeys, RecordPanel } from "@/components/internal/record-panel";
import {
  Avatar,
  Card,
  Field,
  Fields,
  Kbd,
  Notice,
  PageHeader,
  StatusBadge,
  buttonClass,
  formatDate,
  relativeDate,
  text,
} from "@/components/internal/ui";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** A section's list page: header, then the interactive list. */
export async function SectionListPage({
  sectionKey,
  searchParams,
  before,
}: {
  sectionKey: SectionKey;
  searchParams: SearchParams;
  /** Shown between the header and the list (the hackathon tabs). */
  before?: ReactNode;
}) {
  const section = SECTIONS[sectionKey];
  const staff = await requireSection(section);
  const filters = parseFilters(section, await searchParams);
  const data = await listView(section, filters);
  return (
    <>
      <PageHeader eyebrow={section.group} title={section.title} description={section.description} />
      {before}
      {data.ok ? (
        <ListView
          sectionKey={sectionKey}
          rows={data.rows}
          total={data.total}
          statusCounts={data.statusCounts}
          facets={data.facets}
          tags={data.tags}
          tagsReady={data.tagsReady}
          filters={filters}
          canEdit={staff.access === "edit"}
          canExport={canExportSection(staff, section)}
          overdue={data.overdue}
          sender={senderName(staff.email)}
          mailerReady={isMailerConfigured()}
          rowLimit={data.truncated ? ROW_LIMIT : null}
        />
      ) : (
        <Notice tone="error">{data.message}</Notice>
      )}
    </>
  );
}

export async function loadRecord(
  sectionKey: SectionKey,
  params: Promise<{ id: string }>,
  searchParams: SearchParams,
) {
  const section = SECTIONS[sectionKey];
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const filters = parseFilters(section, query);
  const [staff, view] = await Promise.all([
    requireSection(section),
    recordView(section, id, filters),
  ]);
  if (!view) notFound();
  const extras = await entryExtras(section, view.record);
  return {
    ...view,
    ...extras,
    filters,
    canEdit: staff.access === "edit",
    staff,
    mailerReady: isMailerConfigured(),
  };
}

type Loaded = Awaited<ReturnType<typeof loadRecord>>;

/**
 * One entry: a header card, the form answers, and the review rail. Previous
 * and next follow the list (and filters) it was opened from.
 */
export function RecordView({
  sectionKey,
  data,
  meta,
  actions,
  children,
}: {
  sectionKey: SectionKey;
  data: Loaded;
  meta: ReactNode[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const section = SECTIONS[sectionKey];
  const { record, position, filters } = data;
  const id = String(record.id);
  const query = filterParams(filters, { page: false });
  const listPage = position ? Math.floor(position.index / PAGE_SIZE) + 1 : 1;
  const backHref = withQuery(section.path, filterParams({ ...filters, page: listPage }));
  const stepHref = (target?: string) =>
    target ? withQuery(`${section.path}/${target}`, query) : undefined;
  const prev = stepHref(position?.prev);
  const next = stepHref(position?.next);
  const name = text(record.name) || "Unnamed";
  const email = text(record.email);

  const stepClass =
    "flex size-8 items-center justify-center rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink-2)] shadow-[var(--i-shadow-sm)] hover:bg-[var(--i-hover)]";
  const stepDisabled =
    "flex size-8 items-center justify-center rounded-lg border border-[var(--i-line)] text-[var(--i-faint)] opacity-50";

  return (
    <>
      <RecordKeys prev={prev} next={next} />
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
        >
          <ArrowLeft size={14} /> {section.title}
        </Link>
        {position ? (
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[12px] text-[var(--i-faint)] sm:flex">
              <Kbd>k</Kbd>
              <Kbd>j</Kbd>
            </span>
            <span className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
              {position.index + 1} of {position.total}
            </span>
            {prev ? (
              <Link href={prev} aria-label="Previous entry" className={stepClass}>
                <CaretLeft size={14} />
              </Link>
            ) : (
              <span aria-hidden className={stepDisabled}>
                <CaretLeft size={14} />
              </span>
            )}
            {next ? (
              <Link href={next} aria-label="Next entry" className={stepClass}>
                <CaretRight size={14} />
              </Link>
            ) : (
              <span aria-hidden className={stepDisabled}>
                <CaretRight size={14} />
              </span>
            )}
          </div>
        ) : null}
      </div>

      <Card className="mb-5">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <Avatar name={name} email={email} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[20px] font-medium leading-tight tracking-[-0.01em]">{name}</h1>
              <StatusBadge status={record.review_status} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--i-muted)]">
              {meta.filter(Boolean).map((item, index) => (
                <span key={index} className="inline-flex items-center gap-2">
                  {index > 0 ? <span aria-hidden className="text-[var(--i-faint)]">·</span> : null}
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {email && data.canEdit && section.statuses ? (
              <EmailComposer
                sectionKey={sectionKey}
                id={id}
                to={email}
                currentStatus={text(record.review_status) || "new"}
                mailerReady={data.mailerReady}
                vars={{
                  first_name: firstName(text(record.name)),
                  program: programOf(section, record),
                  sender: senderName(data.staff.email),
                }}
              />
            ) : email ? (
              <a href={mailtoHref(email)} className={buttonClass("secondary")}>
                <EnvelopeSimple size={15} /> Email
              </a>
            ) : null}
            {actions}
          </div>
        </div>
      </Card>

      {data.blocked ? (
        <div className="mb-5">
          <Notice tone="warning">
            This address {blockedReason(data.blocked)} {relativeDate(data.blocked.updated_at)}
            {data.blocked.detail ? ` (${data.blocked.detail})` : ""}. The forms and the dashboard won&rsquo;t email it
            again, which protects our sending domains.
          </Notice>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">{children}</div>
        <div className="space-y-4 lg:sticky lg:top-6">
          <RecordPanel
            sectionKey={sectionKey}
            id={id}
            status={text(record.review_status) || "new"}
            tags={rowTags(record)}
            notes={text(record.review_notes)}
            tagOptions={data.tags}
            tagsReady={data.tagsReady}
            canEdit={data.canEdit}
          />
          <Card>
            <div className="px-4 pb-4 pt-3.5">
              <h2 className="mb-3 text-[12px] font-medium text-[var(--i-muted)]">Details</h2>
              <dl className="space-y-2.5 text-[12.5px]">
                {[
                  ["Received", formatDate(record.created_at)],
                  [
                    "Last changed",
                    `${relativeDate(record.updated_at)}${record.reviewed_by ? ` by ${text(record.reviewed_by)}` : ""}`,
                  ],
                  ["Contact consent", record.contact_consent ? "Yes" : "No"],
                  ["Future emails", record.email_updates ? "Opted in" : "No"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-[var(--i-muted)]">{label}</dt>
                    <dd className="min-w-0 truncate text-right" title={value} suppressHydrationWarning>
                      {value}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--i-muted)]">ID</dt>
                  <dd className="min-w-0 truncate font-mono text-[11px] text-[var(--i-muted)]" title={id}>
                    {id.slice(0, 8)}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>
          {data.others.length ? (
            <Card>
              <div className="px-4 pb-3 pt-3.5">
                <h2 className="mb-2 text-[12px] font-medium text-[var(--i-muted)]">Also from this person</h2>
                <ul className="-mx-2">
                  {data.others.map((other) => (
                    <li key={`${other.section}-${other.id}`}>
                      <Link
                        href={`${SECTIONS[other.section].path}/${other.id}`}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-[var(--i-hover)]"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-[var(--i-muted)]">{SECTIONS[other.section].nav} · </span>
                          {other.program}
                        </span>
                        <StatusBadge status={other.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ) : null}
          {data.emails.length ? (
            <Card>
              <div className="px-4 pb-3 pt-3.5">
                <h2 className="mb-2 text-[12px] font-medium text-[var(--i-muted)]">Emails sent</h2>
                <ul className="space-y-2.5">
                  {data.emails.map((sent) => {
                    const scheduledAt = sent.scheduled_for ? Date.parse(sent.scheduled_for) : Number.NaN;
                    const waiting = scheduledAt > Date.now() && (!sent.delivery || sent.delivery.status === "scheduled");
                    const status = sent.delivery?.status ?? (waiting ? "scheduled" : null);
                    return (
                      <li key={sent.id} className="text-[12.5px] leading-snug">
                        <p className="truncate font-medium" title={sent.subject}>{sent.subject}</p>
                        <p className="text-[var(--i-muted)]" title={formatDate(sent.created_at)} suppressHydrationWarning>
                          {sent.sent_by === AUTOMATIC_SENDER ? "Sent automatically" : sent.sent_by.split("@")[0]} ·{" "}
                          {relativeDate(sent.created_at)}
                        </p>
                        {status || waiting ? (
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1" suppressHydrationWarning>
                            {status ? <DeliveryChip status={status} title={sent.delivery?.detail ?? undefined} /> : null}
                            {waiting ? (
                              <span className="text-[11.5px] text-[var(--i-muted)]">for {formatDate(sent.scheduled_for)}</span>
                            ) : null}
                            {waiting && data.canEdit ? <CancelScheduledButton logId={sent.id} /> : null}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** A titled block of answers in the main column. */
export function Answers({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="border-b border-[var(--i-line)] px-5 py-3 text-[13px] font-medium">{title}</h2>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export { Field, Fields };
