import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/internal/email-templates";
import { deliveryTotals, monthlyBody, monthlySubject, type MonthlyReport } from "@/lib/internal/monthly-report";

const report: MonthlyReport = {
  month: "2026-10",
  label: "October 2026",
  clients: [
    { name: "Nebius", engagement: "DevRel retainer", planned: 6, done: 6, late: 0 },
    { name: "Jozu [x](https://evil.example)", engagement: "", planned: 4, done: 2, late: 1 },
  ],
  people: [
    { name: "Priya", tasksDone: 14, published: 5, minutes: 5790, perDay: 370 },
    { name: "Dev", tasksDone: 1, published: 0 },
  ],
  blogPublished: 3,
  applications: { jobs: 23, cohort: null, hackathons: 1 },
  outreach: { added: 8, won: 2 },
};

describe("monthly report", () => {
  it("adds up delivery across clients", () => {
    expect(deliveryTotals(report.clients!)).toEqual({ planned: 10, done: 8, late: 1, rate: 80 });
    expect(deliveryTotals([])).toMatchObject({ rate: null });
  });

  it("names the month in the subject", () => {
    expect(monthlySubject(report)).toBe("Studio1 in October 2026");
  });

  it("lays out each section", () => {
    const body = monthlyBody(report, "Arindam");
    expect(body).toContain("Hi Arindam,");
    expect(body).toContain("8 of 10 planned pieces went live (80%) across 2 engagements. 1 piece still open and late.");
    expect(body).toContain("- Nebius, DevRel retainer: 6 of 6");
    expect(body).toContain("- Priya: 14 tasks done, 5 client pieces published, 96h 30m worked (6h 10m a day)");
    expect(body).toContain("- Dev: 1 task done\n");
    expect(body).toContain("- Hiring: 23 job applications");
    expect(body).toContain("- Hackathons: 1 registration");
    expect(body).toContain("- Outreach: 8 organisations added, 2 won");
  });

  it("leaves out what couldn't be read, and never lets a name become a link", () => {
    const body = monthlyBody(report, "");
    expect(body).not.toContain("DevRel Cohort");
    expect(body).not.toContain("](");
    const empty = monthlyBody({ ...report, clients: null, people: [], outreach: null, blogPublished: null }, "");
    expect(empty).toContain("Client work couldn't be read this time.");
    expect(empty).toContain("Nothing was marked done on Tasks.");
    expect(empty).not.toContain("Outreach");
  });

  it("names who's worth a follow-up, and says so when nobody is", () => {
    const body = monthlyBody(
      {
        ...report,
        review: [
          { name: "Dev", status: "follow_up", reasons: "No sign of work on 4 working days (19, 20, 23 and 24 Oct)" },
          { name: "Priya", status: "watch", reasons: "Monthly report not [sent](https://evil.example)" },
        ],
      },
      "Arindam",
    );
    expect(body).toContain("## Worth a follow-up");
    expect(body).toContain("- Dev, follow up: No sign of work on 4 working days (19, 20, 23 and 24 Oct)\n- Priya, watch:");
    expect(body).not.toContain("](");
    expect(monthlyBody({ ...report, review: [] }, "")).toContain("Nobody stood out: everyone was on track.");
    expect(monthlyBody({ ...report, review: null }, "")).toContain("The monthly review couldn't be read this time.");
    expect(monthlyBody(report, "")).not.toContain("Worth a follow-up");
  });

  it("renders headings in the paper layout", () => {
    const { html, text } = renderEmail({ body: monthlyBody(report, "Arindam"), reason: "x", section: "Monthly report", hideBanner: true });
    expect(html).toContain(">Client work</p>");
    expect(html).not.toContain("## ");
    expect(text).toContain("CLIENT WORK");
  });
});
