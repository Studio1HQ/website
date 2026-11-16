import "server-only";
import { selectRows } from "@/lib/supabase-server";
import { isUuid } from "@/lib/internal/community/clean";

/**
 * The client a won organisation became, for the "Open the client" link:
 * just its name and short name. Null when it can't be read or has gone.
 * (Read here, not through the Clients loaders, which are scoped per person
 * and bring a whole month of work with them.)
 */
export async function getClientById(id: string): Promise<{ name: string; slug: string } | null> {
  if (!isUuid(id)) return null;
  const result = await selectRows<{ name: string; slug: string }>(
    "client_accounts",
    new URLSearchParams({ select: "name,slug", id: `eq.${id}`, limit: "1" }),
  );
  return result.ok && result.rows[0]?.slug ? result.rows[0] : null;
}
