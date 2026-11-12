import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  EnvelopeSimple,
  Handshake,
  Trophy,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { overview } from "@/lib/internal/data";
import { atLeast } from "@/lib/internal/roles";
import { requireStaff } from "@/lib/internal/session";
import {
  SECTIONS,
  statusLabel,
  type SectionKey,
} from "@/lib/internal/sections";
import {
  Avatar,
  Card,
  CardTitle,
  EmptyState,
  Notice,
  StatusBadge,
  StatusDot,
  formatDate,
  relativeDate,
} from "@/components/internal/ui";

export const metadata: Metadata = { title: "Overview" };

const ICONS: Partial<Record<SectionKey, Icon>> = {
  jobs: Briefcase,
  hackathons: Trophy,
  cohort: UsersThree,
};

function greeting(email: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
  const part =
    hour < 5
      ? "evening"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : "evening";
  const name = email.split("@")[0].split(/[._+-]/)[0];
  return `Good ${part}, ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function number(value: number | null) {
  return value === null ? "—" : value.toLocaleString("en-IN");
}

function Kpi({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <Card className="px-3.5 py-3 sm:px-5 sm:py-4">
      <p className="truncate text-[12px] text-[var(--i-muted)] sm:text-[12.5px]">
        {label}
      </p>
      <p
        className={
          accent
            ? "mt-2 text-[24px] font-medium leading-none tabular-nums tracking-[-0.02em] text-[var(--i-accent-text)] sm:text-[30px]"
            : "mt-2 text-[24px] font-medium leading-none tabular-nums tracking-[-0.02em] sm:text-[30px]"
        }
      >
        {value}
      </p>
      <p className="mt-2 hidden text-[12.5px] text-[var(--i-faint)] sm:block">
        {note}
      </p>
    </Card>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, data, params] = await Promise.all([
    requireStaff(),
    overview(),
    searchParams,
  ]);
  const denied = params.denied !== undefined;
  const ready = data.pipelines.filter((pipeline) => pipeline.ok);
  const awaiting = ready.reduce((sum, pipeline) => sum + pipeline.awaiting, 0);
  const lastWeek = ready.reduce((sum, pipeline) => sum + pipeline.lastWeek, 0);
  const total = ready.reduce((sum, pipeline) => sum + pipeline.total, 0);
  const overdue = ready.reduce((sum, pipeline) => sum + pipeline.overdue, 0);
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <>
      <header className="mb-7">
        <p className="mb-1.5 text-[12.5px] text-[var(--i-muted)]">{today}</p>
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.015em]">
          {greeting(staff.email)}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[var(--i-muted)]">
          {awaiting
            ? `${awaiting} ${awaiting === 1 ? "entry is" : "entries are"} waiting for a first look.`
            : "Everything has had a first look."}
        </p>
      </header>

      {ready.length < data.pipelines.length ? (
        <div className="mb-5">
          <Notice tone="error">
            Some numbers couldn&apos;t be loaded from Supabase. The server log
            has the details.
          </Notice>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:gap-4">
        <Kpi
          label="Needs review"
          value={number(awaiting)}
          note={overdue ? `${overdue} waiting over 5 days` : "Status still New"}
          accent
        />
        <Kpi
          label="This week"
          value={number(lastWeek)}
          note="Received in the last 7 days"
        />
        <Kpi
          label="All entries"
          value={number(total)}
          note="Jobs, hackathons and cohort"
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        {data.pipelines.map((pipeline) => {
          const section = SECTIONS[pipeline.key];
          const IconComponent = ICONS[pipeline.key] ?? Briefcase;
          const max = Math.max(
            1,
            ...pipeline.byStatus.map((stage) => stage.count),
          );
          return (
            <Card key={pipeline.key} className="flex flex-col">
              <div className="flex items-center gap-3 px-5 pb-3 pt-4">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]">
                  <IconComponent size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[13.5px] font-medium">
                    {section.nav}
                  </h2>
                  <p className="text-[12px] text-[var(--i-muted)]">
                    {pipeline.ok
                      ? `${number(pipeline.total)} total · ${number(pipeline.lastWeek)} this week`
                      : "Couldn't load"}
                  </p>
                </div>
              </div>
              {pipeline.ok && pipeline.total === 0 ? (
                <p className="flex-1 px-5 pb-5 pt-1 text-[12.5px] text-[var(--i-faint)]">
                  Nothing yet. Entries show up here as the form fills.
                </p>
              ) : (
                <ul
                  className="flex-1 px-2 pb-2"
                  aria-label={`${section.nav} by status`}
                >
                  {pipeline.byStatus.map((stage) => (
                    <li key={stage.status}>
                      <Link
                        href={`${section.path}?status=${stage.status}`}
                        title={`${stage.count} of ${pipeline.total}${pipeline.total ? ` · ${Math.round((stage.count / pipeline.total) * 100)}%` : ""}`}
                        className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 rounded-md px-3 py-[5px] text-[12.5px] hover:bg-[var(--i-hover)]"
                      >
                        <span className="flex items-center gap-2 truncate text-[var(--i-ink-2)]">
                          <StatusDot status={stage.status} />
                          {statusLabel(stage.status)}
                        </span>
                        <span
                          aria-hidden
                          className="h-1.5 rounded-sm bg-[var(--i-track)]"
                        >
                          {stage.count ? (
                            <span
                              className="block h-full rounded-r-[3px] bg-[var(--i-bar)]"
                              style={{
                                width: `${Math.max(4, (stage.count / max) * 100)}%`,
                              }}
                            />
                          ) : null}
                        </span>
                        <span
                          className={
                            stage.count
                              ? "text-right tabular-nums"
                              : "text-right tabular-nums text-[var(--i-faint)]"
                          }
                        >
                          {stage.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={section.path}
                className="flex items-center justify-between border-t border-[var(--i-line)] px-5 py-2.5 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
              >
                {pipeline.awaiting ? (
                  <span>
                    <span className="font-medium tabular-nums text-[var(--i-accent-text)]">
                      {pipeline.awaiting}
                    </span>{" "}
                    to review
                    {pipeline.overdue ? (
                      <span className="text-rose-700 dark:text-rose-300">
                        {" "}
                        · {pipeline.overdue} overdue
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span>All caught up</span>
                )}
                <span className="inline-flex items-center gap-1">
                  Open <ArrowRight size={12} />
                </span>
              </Link>
            </Card>
          );
        })}
      </div>

      <div
        className={
          atLeast(staff.role, "admin")
            ? "grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
            : "grid items-start gap-4"
        }
      >
        <Card>
          <CardTitle>Latest entries</CardTitle>
          {!data.latestOk ? (
            <div className="p-4">
              <Notice tone="error">
                Couldn&apos;t load the latest entries.
              </Notice>
            </div>
          ) : data.latest.length === 0 ? (
            <EmptyState icon={<Briefcase size={20} />} title="No entries yet">
              New applications and registrations will show up here.
            </EmptyState>
          ) : (
            <ul>
              {data.latest.map((entry) => (
                <li
                  key={`${entry.section}-${entry.id}`}
                  className="border-b border-[var(--i-line)] last:border-b-0"
                >
                  <Link
                    href={`${SECTIONS[entry.section].path}/${entry.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--i-hover)]"
                  >
                    <Avatar name={entry.name} email={entry.email} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {entry.name || entry.email}
                      </p>
                      <p className="truncate text-[12.5px] text-[var(--i-muted)]">
                        {SECTIONS[entry.section].nav} · {entry.program}
                      </p>
                    </div>
                    <StatusBadge status={entry.status} />
                    <span
                      className="hidden w-16 text-right text-[12.5px] text-[var(--i-muted)] sm:block"
                      title={formatDate(entry.createdAt)}
                    >
                      {relativeDate(entry.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {atLeast(staff.role, "admin") ? (
          <Card>
            <CardTitle>Audiences</CardTitle>
            <ul>
              {(
                [
                  [
                    "subscribers",
                    data.subscribers,
                    "opted in to future emails",
                    EnvelopeSimple,
                  ],
                  [
                    "partner-pool",
                    data.partners,
                    "open to partner referrals",
                    Handshake,
                  ],
                ] as const
              ).map(([key, value, label, IconComponent]) => (
                <li
                  key={key}
                  className="border-b border-[var(--i-line)] last:border-b-0"
                >
                  <Link
                    href={SECTIONS[key].path}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--i-hover)]"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]">
                      <IconComponent size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">
                        {SECTIONS[key].nav}
                      </p>
                      <p className="text-[12px] text-[var(--i-muted)]">
                        {label}
                      </p>
                    </div>
                    <span className="text-[18px] font-medium tabular-nums">
                      {number(value)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
      {denied ? (
        <p className="mt-5 text-[12.5px] text-[var(--i-muted)]">
          That page needs a higher role. Ask Arindam or Amitesh if you need it.
        </p>
      ) : null}
    </>
  );
}
