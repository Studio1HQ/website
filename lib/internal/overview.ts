import { scopeWork, type ClientScope } from "@/lib/internal/clients/scope";
import { listPosts } from "@/lib/internal/blog/data";
import { clientNeeds, loadClientWork } from "@/lib/internal/clients/data";
import { communityBadges } from "@/lib/internal/community/data";
import { hackathonBreakdown, overview as hiringOverview } from "@/lib/internal/data";
import { pendingCount } from "@/lib/internal/members";
import { canSeeCalls } from "@/lib/internal/calls/access";
import { listCalls, listChanges } from "@/lib/internal/calls/data";
import { loadOrgs, outreachDue } from "@/lib/internal/outreach/data";
import { outreachSummary, todayCalls, todayTasks } from "@/lib/internal/overview-today";
import { listTasks } from "@/lib/internal/tasks/data";
import { SECTIONS, sectionAccess } from "@/lib/internal/sections";
import { canSeeMoney, canSeeOutreach, isAdmin, type Staff } from "@/lib/internal/session";
import { listDays } from "@/lib/internal/team/attendance";
import { teamOverview } from "@/lib/internal/team/overview";
import { taskNeeds } from "@/lib/internal/tasks/needs";
import { monthCounts } from "@/lib/internal/trend";
import { writeHref } from "@/lib/internal/tasks/report-status";
import { periodLabel } from "@/lib/internal/tasks/shared";
import {
  daysInMonth,
  formatMoney,
  isWeekend,
  istNow,
  minutesSoFar,
  monthLabel,
  monthOf,
  type AttendanceDay,
} from "@/lib/internal/team/shared";

/**
 * The dashboard's front page, per person: one "Needs you" list across every
 * area they can open, plus each area's numbers. Nothing is loaded for an
 * area someone can't see, so the page is also the access boundary.
 */

export type AreaKey = "hiring" | "hackathons" | "blog" | "team" | "money" | "community" | "clients" | "outreach" | "access";

export type Attention = {
  area: AreaKey;
  /** "4 job applications to review" */
  label: string;
  /** "2 waiting over 5 days" */
  detail?: string;
  href: string;
  /** Overdue or money: shown in amber. */
  urgent?: boolean;
};

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

function money(byCurrency: Record<string, number>) {
  return Object.entries(byCurrency)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" + ");
}

/** Client work this month, for the Clients card. Null when it can't be read. */
async function clientsSummary(scope: ClientScope) {
  // Client team members an admin gave specific clients count only theirs.
  const work = scopeWork(scope, await loadClientWork());
  if (!work.ok) return { ok: false as const, missing: work.missing };
  // Archived clients are off the Clients page, so they are off this card too.
  const live = work.rows.filter((row) => row.engagement.status === "active" && row.client && !row.client.archived_at);
  return {
    ok: true as const,
    active: live.length,
    red: live.filter((row) => row.health.level === "red").length,
    amber: live.filter((row) => row.health.level === "amber").length,
    inClientReview: live.reduce((sum, row) => sum + row.inClientReview, 0),
    waitingOnClient: live.reduce((sum, row) => sum + row.waitingOnClient, 0),
    blocked: live.reduce((sum, row) => sum + row.blocked, 0),
    done: live.reduce((sum, row) => sum + row.progress.done, 0),
    planned: live.reduce((sum, row) => sum + row.progress.planned, 0),
  };
}

/** Blog posts by stage, for the Blog card and the to-dos. */
async function blogSummary(staff: Staff & { blog: NonNullable<Staff["blog"]> }) {
  const result = await listPosts(staff);
  if (!result.ok) return null;
  const month = monthOf(istNow().date);
  const by = (status: string) => result.posts.filter((post) => post.status === status).length;
  return {
    reviewer: staff.blog === "reviewer",
    drafts: by("draft"),
    inReview: by("in_review"),
    changes: by("changes_requested"),
    approved: by("approved"),
    publishedThisMonth: result.posts.filter(
      (post) => post.status === "published" && typeof post.published_at === "string" && post.published_at.startsWith(month),
    ).length,
    /** Posts published in each of the last six months, oldest first. */
    publishedByMonth: monthCounts(
      result.posts.filter((post) => post.status === "published").map((post) => post.published_at),
      month,
      6,
    ),
    // Writers: their own posts with feedback to act on.
    feedback: result.posts.filter(
      (post) => post.created_by === staff.email && (post.status === "changes_requested" || post.status === "approved"),
    ).length,
  };
}

export async function dashboardOverview(staff: Staff) {
  const admin = isAdmin(staff);
  const now = istNow();
  const month = monthOf(now.date);
  const blogStaff = staff.blog ? (staff as Staff & { blog: NonNullable<Staff["blog"]> }) : null;
  // People who log days but aren't admins see their own day and their interns'.
  const ownEmails = admin ? [] : [...(staff.person ? [staff.person.email] : []), ...staff.interns];

  const [pipelines, team, blog, requests, community, ownDays, hackathons, clientsMine, clients, tasks, outreach, myTasks, myCalls, orgs] = await Promise.all([
    // Every pipeline this person can open: the hiring ones and, for
    // community staff and admins, hackathon registrations.
    staff.role || staff.community ? hiringOverview() : Promise.resolve(null),
    admin ? teamOverview({ money: canSeeMoney(staff) }) : Promise.resolve(null),
    blogStaff ? blogSummary(blogStaff) : Promise.resolve(null),
    admin ? pendingCount() : Promise.resolve(0),
    staff.community ? communityBadges(staff.email) : Promise.resolve(null),
    ownEmails.length ? listDays({ from: now.date, to: now.date, emails: ownEmails }) : Promise.resolve(null),
    staff.community ? hackathonBreakdown() : Promise.resolve(null),
    staff.clients ? clientNeeds(staff.email, staff.clientScope) : Promise.resolve(null),
    staff.clients ? clientsSummary(staff.clientScope) : Promise.resolve(null),
    taskNeeds(staff),
    canSeeOutreach(staff) ? outreachDue(staff.email) : Promise.resolve(0),
    // Today, for the person themselves: their own tasks and their own calls.
    staff.person ? listTasks({ emails: [staff.person.email], from: now.date, to: now.date }) : Promise.resolve(null),
    canSeeCalls(staff)
      ? Promise.all([listCalls({ from: now.date }), listChanges(now.date, now.date)])
      : Promise.resolve(null),
    canSeeOutreach(staff) ? loadOrgs() : Promise.resolve(null),
  ]);

  // The Hiring card: job and cohort pipelines only (hackathons have their own).
  const hiring =
    pipelines && staff.role
      ? { ...pipelines, pipelines: pipelines.pipelines.filter((pipeline) => SECTIONS[pipeline.key].area === "hiring") }
      : null;

  const todo: Attention[] = [];

  // Pipelines: only people who can act on an entry get it as a to-do.
  if (pipelines) {
    for (const pipeline of pipelines.pipelines) {
      if (!pipeline.ok || pipeline.awaiting === 0) continue;
      if (sectionAccess(staff, SECTIONS[pipeline.key]) !== "edit") continue;
      const noun = pipeline.key === "jobs" ? "job application" : pipeline.key === "hackathons" ? "hackathon registration" : "cohort application";
      todo.push({
        area: pipeline.key === "hackathons" ? "hackathons" : "hiring",
        label: `${plural(pipeline.awaiting, noun)} to review`,
        detail: pipeline.overdue ? `${pipeline.overdue} waiting over 5 days` : undefined,
        href: `${SECTIONS[pipeline.key].path}?status=new`,
        urgent: pipeline.overdue > 0,
      });
    }
  }

  if (blog?.reviewer && blog.inReview) {
    todo.push({ area: "blog", label: `${plural(blog.inReview, "blog post")} waiting for review`, href: "/blog" });
  } else if (blog && !blog.reviewer && blog.feedback) {
    todo.push({ area: "blog", label: `${plural(blog.feedback, "post")} of yours with feedback`, href: "/blog" });
  }

  if (team?.ready && team.money) {
    const { payroll, payments } = team.money;
    if (payroll.claimsWaiting) {
      todo.push({
        area: "money",
        label: `${plural(payroll.claimsWaiting, "expense claim")} to approve`,
        href: "/money/payroll",
      });
    }
    if (payments.ok && payments.toPay) {
      const amount = money(payments.toPayByCurrency);
      todo.push({
        area: "money",
        label: `${plural(payments.toPay, "payment")} to make`,
        detail: [amount || null, payments.flagged ? `${payments.flagged} need a look` : null].filter(Boolean).join(" · ") || undefined,
        href: "/money/payments",
        urgent: payments.flagged > 0,
      });
    }
    // Payslips: a nudge from the 25th, while some are still unsent.
    const unsent = payroll.salaried - payroll.sent;
    if (unsent > 0 && Number(now.date.slice(8)) >= Math.min(25, daysInMonth(month))) {
      todo.push({
        area: "money",
        label: `${plural(unsent, "payslip")} to send for ${monthLabel(month)}`,
        href: "/money/payroll",
      });
    }
  }
  if (team?.ready) {
    if (team.notLogged.length && Number(now.time.slice(0, 2)) >= 12) {
      todo.push({
        area: "team",
        label: `${plural(team.notLogged.length, "person", "people")} haven't logged today`,
        detail: team.notLogged
          .slice(0, 3)
          .map((person) => person.name || person.email.split("@")[0])
          .join(", "),
        href: "/people",
      });
    }
  }

  if (requests) {
    todo.push({
      area: "access",
      label: `${plural(requests, "person", "people")} asking for dashboard access`,
      href: "/people",
    });
  }

  if (community) {
    if (community.tasks) {
      todo.push({ area: "community", label: `${plural(community.tasks, "community task")} due`, href: "/community/tasks", urgent: true });
    }
    if (community.sponsors) {
      todo.push({ area: "community", label: `${plural(community.sponsors, "sponsor follow-up")} due`, href: "/community/sponsors" });
    }
    if (community.partners) {
      todo.push({ area: "community", label: `${plural(community.partners, "campus partner follow-up")} due`, href: "/community/campus" });
    }
  }

  if (clientsMine) {
    // Owner load lists each person's own deliverables: due, late and to review.
    const board = "/clients/load";
    if (clientsMine.late) {
      todo.push({ area: "clients", label: `${plural(clientsMine.late, "client deliverable")} of yours late`, href: board, urgent: true });
    }
    if (clientsMine.toReview) {
      todo.push({ area: "clients", label: `${plural(clientsMine.toReview, "client deliverable")} waiting for your review`, href: board });
    }
    if (clientsMine.due) {
      todo.push({ area: "clients", label: `${plural(clientsMine.due, "client deliverable")} of yours due this week`, href: board });
    }
    if (clientsMine.blocked) {
      todo.push({
        area: "clients",
        label: `${plural(clientsMine.blocked, "item")} blocked on engagements you own`,
        href: "/clients",
        urgent: true,
      });
    }
  }
  if (clients?.ok && staff.clients === "manager" && clients.red) {
    todo.push({ area: "clients", label: `${plural(clients.red, "client engagement")} at risk`, href: "/clients", urgent: true });
  }

  // Outreach (people given it): their own follow-ups due on organisations still in play.
  if (outreach) {
    todo.push({
      area: "outreach",
      label: `${plural(outreach, "outreach follow-up")} due`,
      href: "/outreach?view=due",
    });
  }

  // Tasks: your own cards that are late or due today.
  if (tasks.tasksLate) {
    todo.push({ area: "team", label: `${plural(tasks.tasksLate, "task")} of yours late`, href: "/tasks", urgent: true });
  }
  if (tasks.tasksToday) {
    todo.push({ area: "team", label: `${plural(tasks.tasksToday, "task")} of yours due today`, href: "/tasks" });
  }

  // Tasks: your weekly / monthly report, and the founders' reports to read.
  for (const report of tasks.reportsDue) {
    const what = report.period === "week" ? "weekly" : "monthly";
    todo.push({
      area: "team",
      label: report.late
        ? `Your ${what} report is late`
        : report.status === "returned"
          ? `Your ${what} report was sent back`
          : `Your ${what} report is due`,
      detail: periodLabel(report.period, report.start),
      href: writeHref(report.period, report.start),
      urgent: report.late || report.status === "returned",
    });
  }
  if (tasks.reportsToRead) {
    todo.push({
      area: "team",
      label: `${plural(tasks.reportsToRead, "report")} to read`,
      href: "/tasks/reports",
    });
  }

  // Your own day (employees who aren't admins; admins see the whole team).
  const days = ownDays && ownDays.ok ? ownDays.days : [];
  const myDay: AttendanceDay | null = staff.person ? (days.find((day) => day.email === staff.person?.email) ?? null) : null;
  if (!admin && staff.person && staff.person.kind === "employee" && !myDay && !isWeekend(now.date)) {
    todo.push({ area: "team", label: "You haven't started your day", href: "/me" });
  }
  if (admin && staff.person && team?.ready && team.notLogged.some((person) => person.email === staff.email)) {
    todo.unshift({ area: "team", label: "You haven't started your day", href: "/me" });
  }

  return {
    admin,
    now,
    todo,
    hiring,
    /** Registrations per hackathon, for admins and community staff. */
    hackathons: hackathons?.ok ? hackathons.events : null,
    hackathonsOk: hackathons ? hackathons.ok : true,
    blog,
    team,
    community: staff.community !== null,
    /** The Clients card: this month across active engagements; null without access. */
    clients,
    /** Your own tasks due today or late; null off the team list, `ok: false` when unread. */
    myTasks: myTasks ? (myTasks.ok ? { ok: true as const, ...todayTasks(myTasks.rows, now.date) } : { ok: false as const }) : null,
    /** The calls you're in today; null without the Calls page. */
    myCalls: myCalls
      ? myCalls[0].ok
        ? { ok: true as const, items: todayCalls(myCalls[0].rows, myCalls[1].ok ? myCalls[1].rows : [], staff.email, now.date, now.time) }
        : { ok: false as const }
      : null,
    /** The Outreach card (people given it): the pipeline in numbers; null when it can't be read. */
    outreach: orgs?.ok ? { ...outreachSummary(orgs.rows, now.date), mineDue: outreach } : null,
    mine: staff.person
      ? {
          day: myDay,
          soFar: myDay ? minutesSoFar(myDay, now.time) : null,
        }
      : null,
    interns: staff.interns.length
      ? { total: staff.interns.length, logged: days.filter((day) => staff.interns.includes(day.email)).length }
      : null,
  };
}
