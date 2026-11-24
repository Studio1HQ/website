import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import {
  ensureNextCycles,
  monthToPrepare,
} from "@/lib/internal/clients/cycles";
import { todayKey } from "@/lib/internal/clients/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Next month's client cycles. Vercel Cron calls it daily just after
 * midnight IST (vercel.json) with "Authorization: Bearer $CRON_SECRET";
 * without that env var set, or with the wrong secret, nothing runs. From
 * the 25th (IST) it creates next month's cycle, in Planning with scope
 * lines from the templates, for every active engagement that has none
 * (not for a client that is paused, ended or archived); before the 25th
 * it does nothing. Safe to run any number of times.
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
  const today = todayKey();
  const month = monthToPrepare(today);
  if (!month)
    return NextResponse.json({
      ok: true,
      skipped: `Not yet: next month's cycles start on the 25th (today is ${today})`,
    });
  const result = await ensureNextCycles({ month, by: "cron" });
  if (!result.ok) {
    console.error(
      `[clients] creating ${month} cycles failed: ${result.message}`,
    );
    return NextResponse.json({ ok: false, month }, { status: 500 });
  }
  if (result.created) revalidatePath("/internal", "layout");
  console.log(
    `[clients] ${month}: ${result.created} cycle(s) created, ${result.failed} failed`,
  );
  return NextResponse.json({
    ok: result.failed === 0,
    month,
    created: result.created,
    failed: result.failed,
  });
}
