import { listPosts } from "@/lib/internal/blog/data";
import { communityBadges } from "@/lib/internal/community/data";
import { hackathonBreakdown, overview as hiringOverview } from "@/lib/internal/data";
import { pendingCount } from "@/lib/internal/members";
import { SECTIONS, sectionAccess } from "@/lib/internal/sections";
import { isAdmin, type Staff } from "@/lib/internal/session";
import { listDays } from "@/lib/internal/team/attendance";
import { teamOverview } from "@/lib/internal/team/overview";
import {
  daysInMonth,
  formatMoney,
  isWeekend,
  istNow,
  minutesBetween,
  monthLabel,
  monthOf,
  type AttendanceDay,
} from "@/lib/internal/team/shared";

/**
 * The dashboard's front page, per person: one "Needs you" list across every
 * area they can open, plus each area's numbers. Nothing is loaded for an
 * area someone can't see, so the page is also the access boundary.
 */

export type AreaKey = "hiring" | "hackathons" | "blog" | "team" | "money" | "community" | "access";

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

  const [pipelines, team, blog, requests, community, ownDays, hackathons] = await Promise.all([
    // Every pipeline this person can open: the hiring ones and, for
    // community staff and admins, hackathon registrations.
    staff.role || staff.community ? hiringOverview() : Promise.resolve(null),
    admin ? teamOverview() : Promise.resolve(null),
    blogStaff ? blogSummary(blogStaff) : Promise.resolve(null),
    admin ? pendingCount() : Promise.resolve(0),
    staff.community ? communityBadges(staff.email) : Promise.resolve(null),
    ownEmails.length ? listDays({ from: now.date, to: now.date, emails: ownEmails }) : Promise.resolve(null),
    staff.community ? hackathonBreakdown() : Promise.resolve(null),
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
    todo.push({ area: "blog", label: `${plural(blog.inReview, "blog post")} waiting for review`, href: "/internal/blog" });
  } else if (blog && !blog.reviewer && blog.feedback) {
    todo.push({ area: "blog", label: `${plural(blog.feedback, "post")} of yours with feedback`, href: "/internal/blog" });
  }

  if (team?.ready) {
    if (team.payroll.claimsWaiting) {
      todo.push({
        area: "money",
        label: `${plural(team.payroll.claimsWaiting, "expense claim")} to approve`,
        href: "/internal/money/payroll",
      });
    }
    if (team.payments.ok && team.payments.toPay) {
      const amount = money(team.payments.toPayByCurrency);
      todo.push({
        area: "money",
        label: `${plural(team.payments.toPay, "payment")} to make`,
        detail: [amount || null, team.payments.flagged ? `${team.payments.flagged} need a look` : null].filter(Boolean).join(" · ") || undefined,
        href: "/internal/money/payments",
        urgent: team.payments.flagged > 0,
      });
    }
    // Payslips: a nudge from the 25th, while some are still unsent.
    const unsent = team.payroll.salaried - team.payroll.sent;
    if (unsent > 0 && Number(now.date.slice(8)) >= Math.min(25, daysInMonth(month))) {
      todo.push({
        area: "money",
        label: `${plural(unsent, "payslip")} to send for ${monthLabel(month)}`,
        href: "/internal/money/payroll",
      });
    }
    if (team.notLogged.length && Number(now.time.slice(0, 2)) >= 12) {
      todo.push({
        area: "team",
        label: `${plural(team.notLogged.length, "person", "people")} haven't logged today`,
        detail: team.notLogged
          .slice(0, 3)
          .map((person) => person.name || person.email.split("@")[0])
          .join(", "),
        href: "/internal/people",
      });
    }
  }

  if (requests) {
    todo.push({
      area: "access",
      label: `${plural(requests, "person", "people")} asking for dashboard access`,
      href: "/internal/team",
    });
  }

  if (community) {
    if (community.tasks) {
      todo.push({ area: "community", label: `${plural(community.tasks, "community task")} due`, href: "/internal/community/tasks", urgent: true });
    }
    if (community.sponsors) {
      todo.push({ area: "community", label: `${plural(community.sponsors, "sponsor follow-up")} due`, href: "/internal/community/sponsors" });
    }
    if (community.partners) {
      todo.push({ area: "community", label: `${plural(community.partners, "campus partner follow-up")} due`, href: "/internal/community/campus" });
    }
  }

  // Your own day (employees who aren't admins; admins see the whole team).
  const days = ownDays && ownDays.ok ? ownDays.days : [];
  const myDay: AttendanceDay | null = staff.person ? (days.find((day) => day.email === staff.person?.email) ?? null) : null;
  if (!admin && staff.person && staff.person.kind === "employee" && !myDay && !isWeekend(now.date)) {
    todo.push({ area: "team", label: "You haven't started your day", href: "/internal/me" });
  }
  if (admin && staff.person && team?.ready && team.notLogged.some((person) => person.email === staff.email)) {
    todo.unshift({ area: "team", label: "You haven't started your day", href: "/internal/me" });
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
    mine: staff.person
      ? {
          day: myDay,
          soFar: myDay?.start_time && !myDay.end_time ? minutesBetween(myDay.start_time, now.time) : null,
        }
      : null,
    interns: staff.interns.length
      ? { total: staff.interns.length, logged: days.filter((day) => staff.interns.includes(day.email)).length }
      : null,
  };
}
