import { getRecord } from "@/lib/internal/influencers/data";
import { LOGO_KEEP_SECONDS, clientLogo } from "@/lib/internal/clients/logo";
import type { Channel } from "@/lib/internal/influencers/schema";
import { canSeeInfluencers, getStaff } from "@/lib/internal/session";

type Props = { params: Promise<{ id: string }> };

/** A miss: the browser shows the initial instead and asks again tomorrow. */
const missing = () =>
  new Response("Not found", {
    status: 404,
    headers: { "cache-control": "private, max-age=86400" },
  });

/**
 * A newsletter's icon, from the site on its channel. The same lookup and
 * month-long store as a client's logo (lib/internal/clients/logo.ts).
 * Only newsletters: an X or YouTube link would just give the platform's
 * own icon. Influencers people only, like the pages.
 */
export async function GET(_: Request, { params }: Props) {
  const staff = await getStaff();
  if (!staff || !canSeeInfluencers(staff)) return missing();
  const { id } = await params;
  const channel = await getRecord<Channel>("channels", id);
  if (!channel || channel === "error" || channel.platform !== "newsletter" || !channel.url) return missing();
  const logo = await clientLogo(channel.url);
  if (!logo) return missing();
  return new Response(logo.bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": logo.type,
      "cache-control": `private, max-age=${LOGO_KEEP_SECONDS}`,
      // Another site's file served from ours: an SVG opened on its own
      // can't run scripts or load anything.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
