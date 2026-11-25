import { NextResponse } from "next/server";
import { readTeamFile } from "@/lib/internal/team/files";
import { staffFromRequest } from "@/lib/internal/extension/http";

export const dynamic = "force-dynamic";

/**
 * The signed-in person's own profile photo, for the extension's welcome
 * header (it can't send the dashboard's cookie, so this takes its session).
 * 404 without a photo; the extension shows initials then.
 */
export async function GET(request: Request) {
  const staff = await staffFromRequest(request);
  const path = staff?.person?.photo_path;
  if (!path) return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } });
  const file = await readTeamFile(path);
  if (!file.ok) return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } });
  return new NextResponse(file.body, {
    headers: { "content-type": "image/webp", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
  });
}
