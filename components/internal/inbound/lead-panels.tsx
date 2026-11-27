import type { ReactNode } from "react";
import { Warning } from "@/components/internal/icons";
import {
  ApproveTick,
  LeadActions,
  RetryButton,
} from "@/components/internal/inbound/lead-controls";
import {
  Card,
  CardTitle,
  formatDate,
  relativeDate,
} from "@/components/internal/ui";
import {
  canRetry,
  groupFiles,
  inFlight,
  isLongReport,
  latestDone,
} from "@/lib/internal/inbound/lead-page";
import type {
  AgentEvent,
  AgentFile,
  LeadOrg,
} from "@/lib/internal/inbound/schema";
import {
  eventKindLabel,
  eventStatusLabel,
  fileKindLabel,
  fileSize,
  queuedBy,
  shortError,
} from "@/lib/internal/inbound/wording";

/**
 * The lead page's panels. Everything here comes from outside (websites, mail,
 * the agent), so it is written as plain text, never as HTML or markdown.
 */

const PANEL = "flex min-h-0 flex-col";
const SCROLL = "min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-1";

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[12px] text-[var(--i-muted)]">{label}</h3>
      <div className="mt-1 text-[13.5px] leading-relaxed text-[var(--i-ink)]">
        {children}
      </div>
    </div>
  );
}

function Plain({ value }: { value: string }) {
  return <p className="whitespace-pre-wrap break-words">{value}</p>;
}

export function LeadProfile({ org }: { org: LeadOrg }) {
  const parts: [string, string][] = [
    ["About", org.about],
    ["Funding", org.funding],
    ["Why they fit", org.why_fit],
    ["What they asked for", org.interest],
    ["Close to a client", org.conflict],
  ];
  const filled = parts.filter(([, value]) => value.trim());
  return (
    <Card className={`${PANEL} lg:min-h-0 lg:flex-1`}>
      <CardTitle>Company</CardTitle>
      <div className={`${SCROLL} space-y-4 max-lg:max-h-96`}>
        {filled.length ? (
          filled.map(([label, value]) => (
            <Group key={label} label={label}>
              {label === "Close to a client" ? (
                <p className="inline-flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
                  <Warning
                    size={14}
                    weight="bold"
                    className="mt-0.5 shrink-0"
                    aria-hidden
                  />
                  <span className="whitespace-pre-wrap break-words">
                    {value}
                  </span>
                </p>
              ) : (
                <Plain value={value} />
              )}
            </Group>
          ))
        ) : (
          <p className="text-[13px] text-[var(--i-muted)]">
            Nothing is known about this company yet. The agent fills this in
            when it researches the lead.
          </p>
        )}
      </div>
    </Card>
  );
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 marker:text-[var(--i-faint)]">
      {items.map((item, index) => (
        <li key={index} className="whitespace-pre-wrap break-words">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function LeadNext({
  orgId,
  stage,
  events,
  isFounder,
}: {
  orgId: string;
  stage: string;
  events: AgentEvent[];
  isFounder: boolean;
}) {
  const done = latestDone(events);
  const busy = inFlight(events);
  const waiting = done?.waiting_items ?? [];
  return (
    <Card
      className={
        waiting.length
          ? "border-amber-300 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10"
          : undefined
      }
    >
      <CardTitle
        action={
          waiting.length && isFounder ? (
            <LeadActions orgId={orgId} stage={stage} isFounder onlyAnswer />
          ) : null
        }
      >
        Next
      </CardTitle>
      <div className="max-h-[17rem] space-y-4 overflow-y-auto px-5 pb-4 pt-1">
        {busy ? (
          <p className="text-[13px] text-[var(--i-muted)]">
            {busy.status === "running"
              ? "The agent is working on"
              : "Waiting for the agent to start"}{" "}
            “{eventKindLabel(busy.kind)}”.
          </p>
        ) : null}
        {!done ? (
          <p className="text-[13px] text-[var(--i-muted)]">
            The agent hasn&apos;t finished anything for this lead yet.
          </p>
        ) : (
          <>
            {waiting.length ? (
              <Group label="Waiting on you">
                <div className="font-medium">
                  <ItemList items={waiting} />
                </div>
                {!isFounder ? (
                  <p className="mt-2 text-[12.5px] font-normal text-[var(--i-muted)]">
                    Only the founders can answer. Ask one of them.
                  </p>
                ) : null}
              </Group>
            ) : null}
            {done.done_items.length ? (
              <Group label="Done">
                <ItemList items={done.done_items} />
              </Group>
            ) : null}
            {done.next_items.length ? (
              <Group label="Then">
                <ItemList items={done.next_items} />
              </Group>
            ) : null}
            {!waiting.length &&
            !done.done_items.length &&
            !done.next_items.length ? (
              <p className="text-[13px] text-[var(--i-muted)]">
                The agent&apos;s last report had no lists.
              </p>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}

function Report({ report }: { report: string }) {
  if (!report.trim()) return null;
  if (!isLongReport(report))
    return (
      <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--i-ink-2)]">
        {report}
      </p>
    );
  return (
    <details className="group mt-2">
      <summary className="cursor-pointer text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
        <span className="group-open:hidden">Show the report</span>
        <span className="hidden group-open:inline">Hide the report</span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--i-ink-2)]">
        {report}
      </p>
    </details>
  );
}

export function LeadTimeline({
  orgId,
  stage,
  events,
  isFounder,
}: {
  orgId: string;
  stage: string;
  events: AgentEvent[];
  isFounder: boolean;
}) {
  return (
    <Card className={`${PANEL} lg:min-h-0 lg:flex-[3]`}>
      <CardTitle>Timeline</CardTitle>
      <div className={`${SCROLL} max-lg:max-h-96`}>
        {events.length ? (
          <ol className="divide-y divide-[var(--i-line)]">
            {events.map((event) => {
              const error = shortError(event.error, 160);
              return (
                <li key={event.id} className="py-3 first:pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-[13.5px]">
                      <span className="font-medium">
                        {eventKindLabel(event.kind)}
                      </span>{" "}
                      <span
                        className={
                          event.status === "failed"
                            ? "text-rose-700 dark:text-rose-300"
                            : "text-[var(--i-muted)]"
                        }
                      >
                        · {eventStatusLabel(event.status)}
                      </span>
                    </p>
                    <p
                      className="text-[12px] text-[var(--i-muted)]"
                      title={formatDate(event.created_at)}
                    >
                      {queuedBy(event.created_by)} ·{" "}
                      {relativeDate(event.created_at)}
                    </p>
                  </div>
                  {event.status === "failed" ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 break-words text-[12.5px] text-rose-700 dark:text-rose-300">
                        {error || "It failed without saying why."}
                      </p>
                      {canRetry(event, stage, isFounder) ? (
                        <RetryButton orgId={orgId} eventId={event.id} />
                      ) : null}
                    </div>
                  ) : null}
                  <Report report={event.report} />
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-[13px] text-[var(--i-muted)]">
            Nothing has been queued for this lead yet.
          </p>
        )}
      </div>
    </Card>
  );
}

function FileRow({
  file,
  isFounder,
  muted = false,
}: {
  file: AgentFile;
  isFounder: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div className="min-w-0">
        {/* A plain link: the route signs a short-lived address at the click. */}
        <a
          href={`/inbound/files/${file.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`break-all text-[13.5px] underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:decoration-[var(--i-accent)] ${muted ? "text-[var(--i-muted)]" : "text-[var(--i-ink)]"}`}
        >
          {file.name}
        </a>
        <p className="text-[12px] text-[var(--i-muted)]">
          {fileKindLabel(file.kind)} · {fileSize(file.bytes)} ·{" "}
          {relativeDate(file.created_at)}
          {file.open_url ? (
            <>
              {" · "}
              <a
                href={file.open_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--i-ink)] underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:decoration-[var(--i-accent)]"
              >
                Open in Google Slides
              </a>
            </>
          ) : null}
        </p>
      </div>
      {isFounder ? (
        <ApproveTick fileId={file.id} approved={file.approved_to_send} />
      ) : file.approved_to_send ? (
        <span className="shrink-0 text-[12.5px] font-medium text-emerald-700 dark:text-emerald-300">
          Approved to send
        </span>
      ) : null}
    </div>
  );
}

export function LeadFiles({
  files,
  isFounder,
}: {
  files: AgentFile[];
  isFounder: boolean;
}) {
  const groups = groupFiles(files);
  return (
    <Card className={`${PANEL} lg:min-h-0 lg:flex-[2]`}>
      <CardTitle>Files</CardTitle>
      <div className={`${SCROLL} max-lg:max-h-96`}>
        {groups.length ? (
          <ul className="divide-y divide-[var(--i-line)]">
            {groups.map((group) => {
              const [current, ...older] = group.versions;
              return (
                <li key={group.name} className="py-3 first:pt-1">
                  <FileRow file={current} isFounder={isFounder} />
                  {older.length ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
                        {older.length === 1
                          ? "1 earlier version"
                          : `${older.length} earlier versions`}
                      </summary>
                      <div className="mt-2 space-y-2.5 border-l border-[var(--i-line)] pl-3">
                        {older.map((file) => (
                          <FileRow
                            key={file.id}
                            file={file}
                            isFounder={isFounder}
                            muted
                          />
                        ))}
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-[var(--i-muted)]">
            The agent hasn&apos;t made any files for this lead yet.
          </p>
        )}
      </div>
    </Card>
  );
}
