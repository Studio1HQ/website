import { jobLogoSite } from "@/lib/devrel-jobs-data";
import { LOGO_KEEP_SECONDS, clientLogo } from "@/lib/internal/clients/logo";

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A miss: the board shows the company's first letter and asks again tomorrow. */
const missing = () =>
  new Response("Not found", {
    status: 404,
    headers: { "cache-control": "public, max-age=3600, s-maxage=86400" },
  });

/**
 * A DevRel jobs listing's logo: the icon of the company's website (or of
 * the apply link, when that's on the company's own site), found and kept
 * for a month by the same lookup as a client's logo
 * (lib/internal/clients/logo.ts). Public, like the board. Only sites on a
 * stored listing are ever fetched, so this can't be pointed at any address.
 * The board links it with ?v=<host>, so a changed website is a new address
 * and the CDN may keep each one for a long time.
 */
export async function GET(_: Request, { params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) return missing();
  const site = await jobLogoSite(id);
  if (!site) return missing();
  const logo = await clientLogo(site);
  if (!logo) return missing();
  return new Response(logo.bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": logo.type,
      "cache-control": `public, max-age=86400, s-maxage=${LOGO_KEEP_SECONDS}, stale-while-revalidate=86400`,
      // Another site's file served from ours: an SVG opened on its own
      // can't run scripts or load anything.
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
