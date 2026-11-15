import { requireClients } from "@/lib/internal/session";
import { loadClientBySlug } from "@/lib/internal/clients/data";
import { LOGO_KEEP_SECONDS, clientLogo } from "@/lib/internal/clients/logo";

type Props = { params: Promise<{ slug: string }> };

/** A miss: the browser shows the initial instead and asks again tomorrow. */
const missing = () =>
  new Response("Not found", {
    status: 404,
    headers: { "cache-control": "private, max-age=86400" },
  });

/**
 * A client's logo, from the website on its record (see lib/internal/clients/logo.ts).
 * The page links it with ?v=<site>, so a new website gets a new URL and the
 * browser can keep each one for a month.
 */
export async function GET(_: Request, { params }: Props) {
  await requireClients();
  const { slug } = await params;
  const found = await loadClientBySlug(slug);
  const website = found.ok ? found.client?.website : null;
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
