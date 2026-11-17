import { sectionsChanged } from "@/lib/internal/section-cache";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { pruneNotifications } from "@/lib/internal/notifications/data";
import { REJECTED_RETENTION_DAYS, purgeRejectedApplications } from "@/lib/internal/retention";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The daily clean-up: deletes job applications that have sat in Rejected
 * for REJECTED_RETENTION_DAYS (lib/internal/retention.ts), and old bell
 * notifications (lib/internal/notifications/shared.ts). Vercel Cron calls
 * it (vercel.json) with "Authorization: Bearer $CRON_SECRET"; without that
 * env var set, or with the wrong secret, nothing runs.
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
  // Old bell notifications go too (lib/internal/notifications/shared.ts),
  // whatever happens to the applications.
  const [result, notices] = await Promise.all([purgeRejectedApplications(), pruneNotifications()]);
  sectionsChanged();
  if (notices.ok) console.log(`[retention] deleted ${notices.deleted} old notification(s)`);
  else console.error(`[retention] clearing old notifications failed: ${notices.message}`);
  if (!result.ok) {
    console.error(`[retention] purge failed after ${result.deleted} deleted: ${result.message}`);
    return NextResponse.json({ ok: false, deleted: result.deleted }, { status: 500 });
  }
  console.log(`[retention] deleted ${result.deleted} rejected job application(s) older than ${REJECTED_RETENTION_DAYS} days, ${result.files} résumé file(s)`);
  return NextResponse.json(
    { ok: notices.ok, deleted: result.deleted, files: result.files, notifications: notices.ok ? notices.deleted : null },
    { status: notices.ok ? 200 : 500 },
  );
}
