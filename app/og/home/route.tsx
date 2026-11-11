import { renderHomeCard } from "../card";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** The homepage share card, built once at deploy time. */
export function GET() {
  return renderHomeCard();
}
