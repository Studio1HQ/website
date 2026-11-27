import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { MAIL_KEEP_DAYS, mailCutoff } from "@/lib/internal/inbound/rules";
import { deleteRows } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The daily clean-up of inbound mail: deletes rows of inbound_mail older
 * than MAIL_KEEP_DAYS (lib/internal/inbound/rules.ts). Vercel Cron calls it
 * (vercel.json) with "Authorization: Bearer $CRON_SECRET"; without that env
 * var set, or with the wrong secret, nothing runs.
 */
function allowed(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!allowed(request))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await deleteRows(
    "inbound_mail",
    new URLSearchParams({ received_at: `lt.${mailCutoff()}` }),
  );
  if (!result.ok) {
    console.error(`[inbound] purging old mail failed: ${result.message}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  console.log(
    `[inbound] deleted ${result.count} mail row(s) older than ${MAIL_KEEP_DAYS} days`,
  );
  return NextResponse.json({ ok: true, deleted: result.count });
}
