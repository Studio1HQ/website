import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CaretLeft, CaretRight } from "@/components/internal/icons";
import { requireMember, staffName } from "@/lib/internal/session";
import { isFounder } from "@/lib/internal/tasks/access";
import { loadReview } from "@/lib/internal/team/review-data";
import { REVIEW_START, followUpDraft, hoursText, reviewLine, type PersonReview } from "@/lib/internal/team/review";
import { istNow, isMonthKey, monthLabel, monthOf, photoUrl, shiftMonth } from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";
import { Avatar, Card, Notice, PageHeader, buttonClass, relativeDate } from "@/components/internal/ui";
import { StatTile, StatsRow } from "@/components/internal/tasks/week-parts";
import { FollowUpButton } from "@/components/internal/team/follow-up";
import {
  DoneList,
  FlagList,
  HourAxis,
  HourStrip,
  MonthDays,
  ReviewPill,
  SlipList,
  usualHours,
} from "@/components/internal/team/review-parts";

export const metadata: Metadata = { title: "Monthly review" };

const PAGE = "/tasks/reports/review";
const FIRST_MONTH = monthOf(REVIEW_START);
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const href = (month: string, person?: string) =>
  `${PAGE}?month=${month}${person ? `&person=${encodeURIComponent(person)}` : ""}`;

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 flex items-baseline justify-between gap-2 text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--i-muted)]">
        <span>{title}</span>
        {aside ? <span className="normal-case tracking-normal text-[var(--i-faint)]">{aside}</span> : null}
      </h3>
      {children}
    </section>
  );
}

/**
 * The founders' monthly review: for each person, what they finished, what
 * slipped, the working days with no sign of work, and when they usually
 * work, with a flag for who to follow up with and an email to do it. Built
 * live from attendance, Tasks, client work and dashboard activity.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireMember(), searchParams]);
  if (!isFounder(staff)) redirect("/tasks/reports");

  const now = istNow();
  const current = monthOf(now.date);
  // Early in a month, the one that just ended is the one to look at.
  const fallback = Number(now.date.slice(8, 10)) <= 3 && current > FIRST_MONTH ? shiftMonth(current, -1) : current;
  const asked = one(params.month);
  const month = isMonthKey(asked) && asked <= current && asked >= FIRST_MONTH ? asked : fallback;
  const review = await loadReview(month, now);

  const header = (
    <PageHeader
      eyebrow={
        <>
          <Link href="/tasks">Tasks</Link> · <Link href="/tasks/reports">Reports</Link>
        </>
      }
      title="Monthly review"
      description="How each person's month is going: what they finished, what slipped, the days with no sign of work, and when they usually work. Only the founders see this."
      actions={
        <span className="flex items-center gap-1">
          {month > FIRST_MONTH ? (
            <Link href={href(shiftMonth(month, -1))} aria-label="The month before" className={buttonClass("secondary")}>
              <CaretLeft size={13} />
            </Link>
          ) : (
            <span aria-hidden className={cn(buttonClass("secondary"), "opacity-40")}>
              <CaretLeft size={13} />
            </span>
          )}
          <span className="min-w-[8.5rem] text-center text-[13px] font-medium">{monthLabel(month)}</span>
          {month < current ? (
            <Link href={href(shiftMonth(month, 1))} aria-label="The month after" className={buttonClass("secondary")}>
              <CaretRight size={13} />
            </Link>
          ) : (
            <span aria-hidden className={cn(buttonClass("secondary"), "opacity-40")}>
              <CaretRight size={13} />
            </span>
          )}
        </span>
      }
    />
  );

  if ("error" in review)
    return (
      <>
        {header}
        <Notice tone="error">{review.error}</Notice>
      </>
    );

  const { reviews } = review;
  if (!reviews.length)
    return (
      <>
        {header}
        <Notice tone="info">Nobody but the founders is on the team list yet.</Notice>
      </>
    );

  const wanted = one(params.person)?.toLowerCase();
  const chosen = reviews.find((item) => item.email === wanted) ?? reviews[0];
  const toFollow = reviews.filter((item) => item.status === "follow_up");
  const toWatch = reviews.filter((item) => item.status === "watch");
  const working = reviews.reduce((sum, item) => sum + item.workingDays, 0);
  const active = reviews.reduce((sum, item) => sum + item.activeDays, 0);
  const live = month === current;
  const firstNames = (list: PersonReview[]) => list.map((item) => item.name.split(" ")[0]).join(", ");

  return (
    <>
      {header}
      {review.failed.length ? (
        <div className="mb-4">
          <Notice tone="warning">
            Couldn&apos;t read {review.failed.join(", ")} just now, so the review leaves {review.failed.length === 1 ? "it" : "them"}{" "}
            out.
          </Notice>
        </div>
      ) : null}

      <StatsRow>
        <StatTile label="To follow up" value={String(toFollow.length)} note={toFollow.length ? firstNames(toFollow) : "nobody"} />
        <StatTile label="To watch" value={String(toWatch.length)} note={toWatch.length ? firstNames(toWatch) : "nobody"} />
        <StatTile
          label="Finished"
          value={String(reviews.reduce((sum, item) => sum + item.done.length, 0))}
          note="tasks and client pieces"
        />
        <StatTile
          label="Slipped"
          value={String(reviews.reduce((sum, item) => sum + item.slipped.length, 0))}
          note="past their day"
        />
        <StatTile
          label="Working days active"
          value={working ? `${Math.round((active / working) * 100)}%` : "—"}
          note={`${active} of ${working}${live ? " so far" : ""}`}
        />
      </StatsRow>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
        <Card className="min-w-0 self-start">
          <ul className="divide-y divide-[var(--i-line)]">
            {reviews.map((item) => {
              const person = review.people.get(item.email);
              const on = item.email === chosen.email;
              const usual = usualHours(item.timing);
              const followed = review.followUps.get(item.email)?.[0];
              return (
                <li key={item.email}>
                  <Link
                    href={href(month, item.email)}
                    scroll={false}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "block px-4 py-3 transition-colors first:rounded-t-2xl hover:bg-[var(--i-hover)]",
                      on && "bg-[var(--i-selected)] hover:bg-[var(--i-selected)]",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Avatar name={item.name} email={item.email} src={person ? photoUrl(person) : null} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{item.name}</span>
                        <span className="block truncate text-[12px] text-[var(--i-muted)]" title={reviewLine(item)}>
                          {reviewLine(item)}
                        </span>
                      </span>
                      <ReviewPill status={item.status} small />
                    </span>
                    <span className="mt-2 flex items-center gap-3 pl-[38px]">
                      <span className="min-w-0 flex-1">
                        <HourStrip
                          values={item.timing.worked.some(Boolean) ? item.timing.worked : item.timing.actions}
                          label={`When ${item.name} works`}
                          compact
                        />
                      </span>
                      <span className="w-[7.5rem] shrink-0 truncate text-right text-[11.5px] tabular-nums text-[var(--i-muted)]">
                        {followed ? `Followed up ${relativeDate(followed.at)}` : usual.split(" · ")[0] || "No hours logged"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-[var(--i-line)] px-4 py-2.5 text-[11.5px] text-[var(--i-faint)]">
            Each strip is midnight to midnight: darker hours had work on more days.
          </p>
        </Card>

        <PersonPanel
          item={chosen}
          month={month}
          today={now.date}
          sender={staffName(staff)}
          photo={photoUrl(review.people.get(chosen.email) ?? null)}
          designation={review.people.get(chosen.email)?.designation ?? ""}
          followUps={review.followUps.get(chosen.email) ?? []}
        />
      </div>

      <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-[var(--i-muted)]">
        Working days are weekdays since someone joined (or Tasks started on 16 Nov), up to yesterday, less leave. A day shows
        work when hours were logged, something was done on the dashboard, or a task was finished. Something slips when it&apos;s
        done after its day, still open after it, or pushed later once its day has come (pushes count from 26 Nov). Client
        pieces waiting on the client never slip. Founders aren&apos;t reviewed.
      </p>
    </>
  );
}

function PersonPanel({
  item,
  month,
  today,
  sender,
  photo,
  designation,
  followUps,
}: {
  item: PersonReview;
  month: string;
  today: string;
  sender: string;
  photo: string | null;
  designation: string;
  followUps: { at: string; by: string; subject: string }[];
}) {
  const draft = followUpDraft(item, month, today, sender);
  const { timing } = item;
  const usual = usualHours(timing);
  const serious = item.flags.filter((flag) => flag.level !== "note");
  const last = followUps[0];
  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={item.name} email={item.email} src={photo} size={40} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[16px] font-medium">{item.name}</span>
              <ReviewPill status={item.status} />
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-[var(--i-muted)]">
              {[designation, item.workingDays ? `active ${item.activeDays} of ${item.workingDays} working days` : "", item.leaveDays ? `${item.leaveDays} on leave` : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <FollowUpButton
            email={item.email}
            name={item.name}
            month={month}
            draft={draft}
            sender={sender.split(" ")[0]}
            primary={item.status === "follow_up"}
          />
          {last ? (
            <span className="text-[11.5px] text-[var(--i-muted)]" title={last.subject}>
              {followUps.length > 1 ? `${followUps.length} follow-ups · last ` : "Followed up "}
              {relativeDate(last.at)} by {last.by.split("@")[0].replace(/^\w/, (letter) => letter.toUpperCase())}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <Section title="What to look at">
          {item.flags.length ? (
            <FlagList flags={item.flags} />
          ) : (
            <p className="text-[13px] text-[var(--i-muted)]">Nothing to flag.</p>
          )}
          {item.highlights.length ? (
            <p className="mt-3 text-[12.5px] text-[var(--i-muted)]">
              {serious.length ? "Also: " : ""}
              {item.highlights.join(" · ")}
            </p>
          ) : null}
        </Section>

        <Section title="Their month">
          <MonthDays days={item.days} />
        </Section>
      </div>

      <div className="mt-6">
        <Section
          title="When they work"
          aside={timing.loggedDays ? `from ${timing.loggedDays} logged day${timing.loggedDays === 1 ? "" : "s"}` : undefined}
        >
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="space-y-2">
              <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
                <span className="text-[12px] text-[var(--i-muted)]">Hours logged</span>
                <HourStrip values={timing.worked} label="Hours of the day with work logged" />
              </div>
              <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
                <span className="text-[12px] text-[var(--i-muted)]">On the dashboard</span>
                <HourStrip values={timing.actions} tone="ink" label="Hours of the day with dashboard activity" />
              </div>
              <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
                <span />
                <HourAxis />
              </div>
            </div>
            <dl className="space-y-1.5 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--i-muted)]">Usual day</dt>
                <dd className="text-right tabular-nums">{usual.split(" · ")[0] || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--i-muted)]">Average day</dt>
                <dd className="tabular-nums">{timing.perDay !== null ? hoursText(timing.perDay) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--i-muted)]">Busiest online</dt>
                <dd className="tabular-nums">
                  {timing.busiest ? `${String(timing.busiest.from).padStart(2, "0")}:00–${String(timing.busiest.to).padStart(2, "0")}:00` : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Finished" aside={String(item.done.length)}>
          <div className="max-h-64 overflow-y-auto pr-1">
            <DoneList items={item.done} />
          </div>
        </Section>
        <Section title="Slipped" aside={String(item.slipped.length)}>
          <div className="max-h-64 overflow-y-auto pr-1">
            <SlipList items={item.slipped} />
          </div>
        </Section>
      </div>
    </Card>
  );
}
