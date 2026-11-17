import { getOrg } from "@/lib/internal/outreach/data";
import { LOGO_KEEP_SECONDS, clientLogo } from "@/lib/internal/clients/logo";
import { getStaff, isAdmin } from "@/lib/internal/session";

type Props = { params: Promise<{ id: string }> };

/** A miss: the browser shows the initial instead and asks again tomorrow. */
const missing = () =>
  new Response("Not found", {
    status: 404,
    headers: { "cache-control": "private, max-age=86400" },
  });

/**
 * An organisation's logo, from the website on its record. The same lookup
 * and month-long store as a client's (lib/internal/clients/logo.ts), so a
 * prospect that becomes a client keeps its icon. Admins only, like the
 * pages; anyone else gets a plain miss, not the sign-in page.
 */
export async function GET(_: Request, { params }: Props) {
  const staff = await getStaff();
  if (!staff || !isAdmin(staff)) return missing();
  const { id } = await params;
  const org = await getOrg(id);
  const website = org && org !== "error" ? org.website : null;
  if (!website) return missing();
  const logo = await clientLogo(website);
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
