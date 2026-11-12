import { NextResponse } from "next/server";
import { resumeUrl } from "@/lib/internal/data";

/** Redirects to a two-minute signed link for the applicant's résumé PDF. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // resumeUrl checks the session before reading anything.
  const url = await resumeUrl((await params).id);
  if (!url) {
    return new NextResponse("Résumé not found.", {
      status: 404,
      headers: { "cache-control": "no-store" },
    });
  }
  return NextResponse.redirect(url, {
    status: 303,
    headers: { "cache-control": "no-store" },
  });
}
