import { asConnected, json } from "@/lib/internal/extension/http";
import { areasFor, homeFor, staffName } from "@/lib/internal/session";

export const dynamic = "force-dynamic";

/** Who the extension is signed in as; 401 once the session has run out or access is gone. */
export async function GET(request: Request) {
  return asConnected(request, async (staff) =>
    json({ email: staff.email, name: staffName(staff), areas: areasFor(staff), home: homeFor(staff) }),
  );
}
