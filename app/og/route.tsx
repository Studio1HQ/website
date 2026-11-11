import type { NextRequest } from "next/server";
import { cleanOgPath, cleanOgTitle, ogSection } from "@/lib/og";
import { renderPageCard } from "./card";

export const runtime = "nodejs";

/**
 * Share card for any page other than home and blog posts:
 * /og?title=…&path=…&v=…, made by ogImageUrl in lib/og.ts. Drawn on the first
 * request, then cached by the CDN and by social networks for a year.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = cleanOgTitle(searchParams.get("title")) || "Studio1";
  const { kicker, cta } = ogSection(cleanOgPath(searchParams.get("path")));
  return renderPageCard({ kicker, title, cta });
}
