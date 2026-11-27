import { LOGO_KEEP_SECONDS, clientLogo } from "@/lib/internal/clients/logo";
import { isUuid } from "@/lib/internal/community/clean";
import { TABLES } from "@/lib/internal/inbound/data";
import { INBOUND_SOURCES } from "@/lib/internal/inbound/schema";
import { canSeeInbound, getStaff } from "@/lib/internal/session";
import { selectRows } from "@/lib/supabase-server";

type Props = { params: Promise<{ id: string }> };

/** A miss: the browser shows the initial instead and asks again tomorrow. */
const missing = () =>
  new Response("Not found", {
    status: 404,
    headers: { "cache-control": "private, max-age=86400" },
  });

/**
 * A lead's logo, from the website on its record: the same lookup and store as
 * Outreach's and Clients' (lib/internal/clients/logo.ts). Inbound people only;
 * anyone else gets a plain miss, not the sign-in page.
 */
export async function GET(_: Request, { params }: Props) {
  const staff = await getStaff();
  if (!staff || !canSeeInbound(staff)) return missing();
  const { id } = await params;
  if (!isUuid(id)) return missing();
  const result = await selectRows<{ website: string | null; source: string }>(
    TABLES.orgs,
    new URLSearchParams({
      select: "website,source",
      id: `eq.${id.toLowerCase()}`,
      limit: "1",
    }),
  );
  const row = result.ok ? result.rows[0] : null;
  if (
    !row?.website ||
    !(INBOUND_SOURCES as readonly string[]).includes(row.source)
  )
    return missing();
  const logo = await clientLogo(row.website);
  if (!logo) return missing();
  return new Response(logo.bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": logo.type,
      "cache-control": `private, max-age=${LOGO_KEEP_SECONDS}`,
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
