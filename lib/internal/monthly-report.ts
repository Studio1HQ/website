/**
 * The monthly report: one email to the founders on the 1st, about the month
 * that just ended. Client work delivered against plan, what each person
 * finished, the blog, applications and outreach. Pure, so the wording is
 * tested; lib/internal/monthly-report-data.ts gathers the numbers and
 * app/api/cron/monthly-report/route.ts sends it.
 *
 * It's the only scheduled email the dashboard sends to the team: one a
 * month, not one per event.
 */

export type MonthlyReport = {
  /** "2026-10". */
  month: string;
  /** "October 2026". */
  label: string;
  /** Null when client work couldn't be read. */
  clients:
    | {
        name: string;
        engagement: string;
        planned: number;
        done: number;
        /** Still open and past due when the report was made. */
        late: number;
      }[]
    | null;
  /** Null when it couldn't be read. Only people with something to show. */
  people:
    | {
        name: string;
        tasksDone: number;
        published: number;
        /** Minutes worked in the month, and on an average working day. */
        minutes?: number;
        perDay?: number | null;
      }[]
    | null;
  /**
   * From the monthly review (lib/internal/team/review.ts): the people to
   * follow up with or watch, and why. Null when it couldn't be read; left
   * out of older callers.
   */
  review?: { name: string; status: "follow_up" | "watch"; reasons: string }[] | null;
  /** Posts published on the Studio1 blog; null when unread. */
  blogPublished: number | null;
  applications: { jobs: number | null; cohort: number | null; hackathons: number | null };
  /** Null until the Outreach tables exist. */
  outreach: { added: number; won: number } | null;
};

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "96h" / "6h 10m". */
function hours(minutes: number) {
  const whole = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return whole ? (rest ? `${whole}h ${rest}m` : `${whole}h`) : `${rest}m`;
}

/** Bullets never carry link markup: a name can't become a link in the email. */
function plain(text: string) {
  return text.replace(/[\[\]()]/g, " ").replace(/\s+/g, " ").trim();
}

export function monthlySubject(report: Pick<MonthlyReport, "label">) {
  return `Studio1 in ${report.label}`;
}

/** Delivered against planned across every client, or null with no plan. */
export function deliveryTotals(clients: NonNullable<MonthlyReport["clients"]>) {
  const planned = clients.reduce((sum, row) => sum + row.planned, 0);
  const done = clients.reduce((sum, row) => sum + row.done, 0);
  const late = clients.reduce((sum, row) => sum + row.late, 0);
  return { planned, done, late, rate: planned ? Math.round((Math.min(done, planned) / planned) * 100) : null };
}

/** The email's body, in the plain-text form renderEmail lays out. */
export function monthlyBody(report: MonthlyReport, firstName: string) {
  const blocks: string[] = [`Hi${firstName ? ` ${firstName}` : ""},`, `Here's how ${report.label} went at Studio1.`];

  blocks.push("## Client work");
  if (report.clients === null) blocks.push("Client work couldn't be read this time. The Clients page has it.");
  else if (!report.clients.length) blocks.push("No client months were running.");
  else {
    const total = deliveryTotals(report.clients);
    blocks.push(
      `${total.done} of ${total.planned} planned pieces went live${total.rate === null ? "" : ` (${total.rate}%)`} across ${plural(report.clients.length, "engagement")}${total.late ? `. ${plural(total.late, "piece")} still open and late.` : "."}`,
    );
    blocks.push(
      report.clients
        .map(
          (row) =>
            `- ${plain(row.name)}${row.engagement ? `, ${plain(row.engagement)}` : ""}: ${row.done} of ${row.planned}${row.late ? `, ${row.late} late` : ""}`,
        )
        .join("\n"),
    );
  }

  blocks.push("## The team");
  // The week-by-week detail is on the Team report page.
  if (report.people === null) blocks.push("Tasks couldn't be read this time.");
  else if (!report.people.length) blocks.push("Nothing was marked done on Tasks.");
  else
    blocks.push(
      report.people
        .map(
          (person) =>
            `- ${plain(person.name)}: ${plural(person.tasksDone, "task")} done${person.published ? `, ${plural(person.published, "client piece")} published` : ""}${
              person.minutes ? `, ${hours(person.minutes)} worked${person.perDay ? ` (${hours(person.perDay)} a day)` : ""}` : ""
            }`,
        )
        .join("\n"),
    );

  if (report.review !== undefined) {
    blocks.push("## Worth a follow-up");
    if (report.review === null) blocks.push("The monthly review couldn't be read this time.");
    else if (!report.review.length) blocks.push("Nobody stood out: everyone was on track.");
    else
      blocks.push(
        report.review
          .map(
            (person) =>
              `- ${plain(person.name)}, ${person.status === "follow_up" ? "follow up" : "watch"}: ${person.reasons.replace(/[\[\]]/g, " ")}`,
          )
          .join("\n"),
        "The Monthly review page (Tasks, Reports) has each person's month, and a follow-up email ready to edit and send.",
      );
  }

  const rest: string[] = [];
  if (report.blogPublished !== null) rest.push(`- Blog: ${plural(report.blogPublished, "post")} published`);
  const { jobs, cohort, hackathons } = report.applications;
  if (jobs !== null) rest.push(`- Hiring: ${plural(jobs, "job application")}`);
  if (cohort !== null) rest.push(`- DevRel Cohort: ${plural(cohort, "application")}`);
  if (hackathons !== null) rest.push(`- Hackathons: ${plural(hackathons, "registration")}`);
  if (report.outreach)
    rest.push(`- Outreach: ${plural(report.outreach.added, "organisation")} added, ${report.outreach.won} won`);
  if (rest.length) blocks.push("## Everything else", rest.join("\n"));

  blocks.push("These are the numbers as the dashboard had them this morning. The button below opens it for the detail behind any of them.");
  return blocks.join("\n\n");
}
