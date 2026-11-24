import type { ReactNode } from "react";
import { CheckCircle, Info } from "@/components/internal/icons";
import {
  DELIVERABLE_STATUSES,
  personName,
  toneOf,
  type Tone,
} from "@/lib/internal/clients/schema";
import {
  WEEK_GROUPS,
  groupWeek,
  shortDay,
  type WeekGroup,
  type WeekLine,
} from "@/lib/internal/clients/week";
import { TASK_STATUSES, hoursLabel } from "@/lib/internal/tasks/shared";
import { cn } from "@/lib/utils";
import { Card, CardTitle, ExternalLink } from "@/components/internal/ui";
import { Pill } from "@/components/internal/community/ui";

/*
 * A client's week in the workspace: Done, In progress, Up next and Blocked,
 * one line per task (from the team's task tracker) or deliverable. No
 * hooks, so it renders on the server; the buttons come in as `actions`.
 */

const GROUP_TONE: Record<WeekGroup, string> = {
  done: "text-emerald-700 dark:text-emerald-300",
  doing: "text-sky-700 dark:text-sky-300",
  next: "text-[var(--i-muted)]",
  blocked: "text-rose-700 dark:text-rose-300",
};

function statusTone(line: WeekLine): Tone {
  if (line.source === "deliverable")
    return toneOf(DELIVERABLE_STATUSES, line.statusValue);
  return (
    TASK_STATUSES.find((status) => status.value === line.statusValue)?.tone ??
    "stone"
  );
}

export function ClientWeek({
  lines,
  names,
  engagementNames,
  time,
  tasks,
  heading,
  switcher,
  actions,
}: {
  lines: readonly WeekLine[];
  names: Readonly<Record<string, string>>;
  /** engagement id → name, when the client has more than one. */
  engagementNames?: Readonly<Record<string, string>>;
  /** Minutes per person, or null when logs can't be read. */
  time: readonly { email: string; name: string; minutes: number }[] | null;
  tasks: "ready" | "missing" | "failed";
  heading: ReactNode;
  switcher: ReactNode;
  actions?: ReactNode;
}) {
  const groups = groupWeek(lines);
  const total = time?.reduce((sum, row) => sum + row.minutes, 0) ?? 0;
  return (
    <section aria-label="This week" className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 text-[16px] font-medium tracking-[-0.01em]">
          {heading}
        </h2>
        {switcher}
      </div>
      {actions ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}

      {tasks !== "ready" ? (
        <p className="mb-3 flex items-start gap-2 text-[12.5px] leading-snug text-[var(--i-muted)]">
          <Info size={14} className="mt-0.5 shrink-0" />
          {tasks === "missing"
            ? "Showing deliverables only. Tasks from the team's task tracker show here once the Team tasks area is switched on."
            : "Couldn't load the team's tasks just now, so this shows deliverables only. Reload in a minute."}
        </p>
      ) : null}

      {/* Only the groups with something in them; one quiet line when none do. */}
      {WEEK_GROUPS.every((group) => !groups[group.value].length) ? (
        <p className="rounded-xl border border-dashed border-[var(--i-line-strong)] px-5 py-4 text-[13px] text-[var(--i-muted)]">
          Nothing this week yet. Work shows here when it&apos;s due this week,
          moves, or someone logs a task for this client.
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {WEEK_GROUPS.filter((group) => groups[group.value].length).map(
          (group) => {
            const items = groups[group.value];
            return (
              <Card key={group.value} className="h-fit min-w-0">
                <CardTitle>
                  <span className={GROUP_TONE[group.value]}>{group.label}</span>{" "}
                  <span className="font-normal tabular-nums text-[var(--i-faint)]">
                    {items.length}
                  </span>
                </CardTitle>
                <ul className="divide-y divide-[var(--i-line)]">
                  {items.map((line) => (
                    <WeekLineRow
                      key={line.key}
                      line={line}
                      names={names}
                      engagement={
                        engagementNames && line.engagementId
                          ? engagementNames[line.engagementId]
                          : undefined
                      }
                    />
                  ))}
                </ul>
              </Card>
            );
          },
        )}
      </div>

      {time && time.length ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
          Time logged:{" "}
          {time
            .map((row) => `${row.name} ${hoursLabel(row.minutes)}`)
            .join(" · ")}
          {time.length > 1 ? ` · ${hoursLabel(total)} in all` : ""}
        </p>
      ) : null}
    </section>
  );
}

function WeekLineRow({
  line,
  names,
  engagement,
}: {
  line: WeekLine;
  names: Readonly<Record<string, string>>;
  engagement?: string;
}) {
  const who = personName(line.who, names);
  const day = line.day
    ? `${line.dayKind === "done" ? "Done" : "Due"} ${shortDay(line.day)}`
    : null;
  const meta = [
    line.source === "deliverable" ? "Deliverable" : null,
    line.deliverableTitle ? `Part of ${line.deliverableTitle}` : null,
    who || (line.source === "deliverable" ? "No owner" : null),
    engagement ?? null,
  ].filter(Boolean);
  return (
    <li className="px-5 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1 basis-48">
          <p className="flex min-w-0 items-start gap-1.5 text-[13.5px] leading-snug">
            {line.group === "done" ? (
              <CheckCircle
                size={14}
                weight="fill"
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
            ) : null}
            <span className="min-w-0 break-words">{line.title}</span>
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--i-muted)]">
            {meta.join(" · ")}
            {line.url ? (
              <>
                {" · "}
                <ExternalLink href={line.url}>Live</ExternalLink>
              </>
            ) : null}
          </p>
          {line.blocked && line.reason ? (
            <p className="mt-0.5 text-[12px] leading-snug text-rose-700 dark:text-rose-300">
              Blocked: {line.reason}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {line.waitingOnClient ? (
            <Pill tone="sky">Waiting on client</Pill>
          ) : null}
          <Pill tone={statusTone(line)}>{line.status}</Pill>
          {day ? (
            <span
              className={cn(
                "text-[12px] tabular-nums",
                line.late
                  ? "font-medium text-amber-700 dark:text-amber-300"
                  : "text-[var(--i-muted)]",
              )}
              title={line.late ? "Past its due day" : undefined}
            >
              {day}
              {line.late ? " · late" : ""}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
