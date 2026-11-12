import { NextResponse, type NextRequest } from "next/server";
import { unsubscribe, verifyUnsubscribe } from "@/lib/unsubscribe";

/**
 * One-click unsubscribe (RFC 8058), the URL in our List-Unsubscribe header:
 * mail apps POST here when someone clicks their built-in Unsubscribe button.
 * A GET (someone opening the link) shows the confirmation page instead, so
 * link scanners can't unsubscribe anyone.
 */
export async function POST(request: NextRequest) {
  const email = await verifyUnsubscribe(
    request.nextUrl.searchParams.get("e"),
    request.nextUrl.searchParams.get("t"),
  );
  if (!email) return new NextResponse("Invalid link", { status: 400 });
  const result = await unsubscribe(email);
  if (!result.ok) {
    console.error(`[unsubscribe] one-click failed: ${result.message}`);
    return new NextResponse("Try again later", { status: 503 });
  }
  return new NextResponse("Unsubscribed", { status: 200 });
}

export function GET(request: NextRequest) {
  const url = new URL("/unsubscribe", request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, 303);
}
