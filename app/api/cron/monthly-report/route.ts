import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isMonthKey, monthOf, shiftMonth, todayKey } from "@/lib/internal/clients/schema";
import { renderEmail } from "@/lib/internal/email-templates";
import { monthlyBody, monthlySubject } from "@/lib/internal/monthly-report";
import { loadMonthlyReport } from "@/lib/internal/monthly-report-data";
import { OWNERS } from "@/lib/internal/roles";
import { getPerson } from "@/lib/internal/team/people";
import { displayName } from "@/lib/internal/team/shared";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { baseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The monthly report email. Vercel Cron calls it at 9:00 IST on the 1st
 * (vercel.json) with "Authorization: Bearer $CRON_SECRET"; without that env
 * var set, or with the wrong secret, nothing runs. It reports on the month
 * that just ended and goes to the founders only. `?month=2026-10` sends an
 * earlier month again (same secret). Safe to run twice: the second email
 * for the same month and person is dropped.
 */
function allowed(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isMailerConfigured()) return NextResponse.json({ ok: true, skipped: "Email isn't set up" });
  const last = shiftMonth(monthOf(todayKey()), -1);
  const asked = request.nextUrl.searchParams.get("month");
  const month = isMonthKey(asked) && asked <= last ? asked : last;

  const report = await loadMonthlyReport(month);
  let sent = 0;
  let failed = 0;
  for (const to of OWNERS) {
    try {
      const person = await getPerson(to);
      const { html, text } = renderEmail({
        body: monthlyBody(report, displayName(person ?? { email: to, name: "" }).split(" ")[0]),
        call: { label: "Open the dashboard", url: `${baseUrl}/internal` },
        reason: "You're getting this because you're a Studio1 founder. It's sent once a month, on the 1st.",
        section: "Monthly report",
        program: report.label,
        hideBanner: true,
      });
      await sendMail({ to, subject: monthlySubject(report), html, text }, undefined, {
        idempotencyKey: `monthly-report-${month}-${to}`,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`[report] the ${month} report to ${to} failed`, error);
    }
  }
  console.log(`[report] ${month}: ${sent} sent, ${failed} failed`);
  return NextResponse.json({ ok: failed === 0, month, sent, failed }, { status: failed ? 500 : 200 });
}
