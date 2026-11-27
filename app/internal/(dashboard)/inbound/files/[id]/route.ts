import { NextResponse } from "next/server";
import { getInboundFile, signedFileUrl } from "@/lib/internal/inbound/data";
import { canSeeInbound, getStaff } from "@/lib/internal/session";

/**
 * A lead's file: checks the session and the area, then sends the browser on
 * to a link that works for one minute. The link is made at the click, never
 * written into a page, so it can't be copied out of the HTML or kept.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [staff, { id }] = await Promise.all([getStaff(), params]);
  // A file, so no redirect to the sign-in page: just not there.
  if (!staff || !canSeeInbound(staff))
    return new Response("Not found", { status: 404 });
  const file = await getInboundFile(id.toLowerCase());
  if (file === "error")
    return new Response("Couldn't load that file. Try again in a minute.", {
      status: 502,
    });
  if (!file) return new Response("Not found", { status: 404 });
  const link = await signedFileUrl(file);
  if (!link.ok) return new Response(link.message, { status: 502 });
  console.info(`[inbound] ${staff.email} opened the file ${file.id}`);
  const target = new URL(link.url, request.url);
  if (target.protocol !== "https:" && target.protocol !== "http:")
    return new Response("Not found", { status: 404 });
  return NextResponse.redirect(target, {
    status: 302,
    headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
}
