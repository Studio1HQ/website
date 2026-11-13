import { NextResponse, type NextRequest } from "next/server";

/**
 * Where Supabase's old magic links landed. Sign-in now uses an emailed code
 * (app/internal/login/actions.ts), so a link from an older email just goes
 * back to the login page with a note. Safe to delete once those have gone.
 */
export function GET(request: NextRequest) {
  const url = new URL("/internal/login", request.url);
  url.searchParams.set("error", "expired");
  return NextResponse.redirect(url, 303);
}
