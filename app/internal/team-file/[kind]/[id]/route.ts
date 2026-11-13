import { NextResponse, type NextRequest } from "next/server";
import { selectRows, signedFileUrl } from "@/lib/supabase-server";
import { TEAM_BUCKET, readTeamFile } from "@/lib/internal/team/files";
import { getPerson } from "@/lib/internal/team/people";
import { getReimbursement } from "@/lib/internal/team/reimbursements";
import { isAdmin, requireMember } from "@/lib/internal/session";
import { isUuid } from "@/lib/internal/team/shared";
import { emailAddress } from "@/lib/internal/token";

type Props = { params: Promise<{ kind: string; id: string }> };

/** A path segment decoded, or as it came when it isn't valid percent-encoding. */
function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store" } });

/** A two-minute signed link, so PDFs open in the browser's own viewer. */
async function redirectTo(path: string) {
  const signed = await signedFileUrl(TEAM_BUCKET, path, 120);
  if (!signed.ok) return notFound();
  return NextResponse.redirect(signed.url, { status: 303, headers: { "cache-control": "no-store" } });
}

/**
 * Files from the team pages, each checked against who's asking:
 *   /internal/team-file/photo/<email>    a profile photo: anyone signed in
 *   /internal/team-file/receipt/<id>     an expense receipt: its owner or an admin
 *   /internal/team-file/invoice/<id>     an invoice: admins only
 */
export async function GET(_: NextRequest, { params }: Props) {
  const staff = await requireMember();
  const { kind, id } = await params;

  if (kind === "photo") {
    const address = emailAddress(safeDecode(id));
    const person = address ? await getPerson(address) : null;
    if (!person?.photo_path) return notFound();
    const file = await readTeamFile(person.photo_path);
    if (!file.ok) return notFound();
    return new NextResponse(file.body, {
      headers: {
        "content-type": "image/webp",
        // The URL carries the photo's version, so it can be cached.
        "cache-control": "private, max-age=86400",
        "x-content-type-options": "nosniff",
      },
    });
  }

  if (kind === "receipt") {
    const item = await getReimbursement(id);
    if (!item?.receipt_path || (item.email !== staff.email && !isAdmin(staff))) return notFound();
    return redirectTo(item.receipt_path);
  }

  if (kind === "invoice" && isAdmin(staff) && isUuid(id)) {
    const result = await selectRows<{ invoice_path: string | null }>(
      "payments",
      new URLSearchParams({ select: "invoice_path", id: `eq.${id}`, limit: "1" }),
    );
    const path = result.ok ? result.rows[0]?.invoice_path : null;
    return path ? redirectTo(path) : notFound();
  }

  return notFound();
}
