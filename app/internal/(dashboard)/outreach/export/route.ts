import { toCsv } from "@/lib/internal/csv";
import { todayKey } from "@/lib/internal/community/schema";
import { loadMainContacts, loadOrgs } from "@/lib/internal/outreach/data";
import { isAdmin, getStaff } from "@/lib/internal/session";

const COLUMNS = [
  "name",
  "website",
  "kind",
  "stage",
  "source",
  "owner",
  "next_step",
  "follow_up_on",
  "last_contact_on",
  "interest",
  "est_value",
  "currency",
  "lost_reason",
  "closed_on",
  "tags",
  "contact_name",
  "contact_title",
  "contact_email",
  "do_not_contact",
  "notes",
  "created_at",
];

/**
 * Every organisation as CSV, with its main contact, in the columns the
 * import reads back. Admins only, like the pages; each download is logged.
 */
export async function GET() {
  const staff = await getStaff();
  // A file, so no redirect to the sign-in page: just not there.
  if (!staff || !isAdmin(staff)) return new Response("Not found", { status: 404 });
  const [orgs, contacts] = await Promise.all([loadOrgs(), loadMainContacts()]);
  if (!orgs.ok) return new Response(orgs.message, { status: orgs.missing ? 503 : 502 });
  if (!contacts.ok) return new Response(contacts.message, { status: 502 });
  const person = new Map(contacts.rows.map((contact) => [contact.org_id, contact]));
  const rows = orgs.rows.map((org) => {
    const main = person.get(org.id);
    return {
      ...org,
      contact_name: main?.name ?? "",
      contact_title: main?.title ?? "",
      contact_email: main?.email ?? "",
      do_not_contact: main?.do_not_contact ? "yes" : "",
      created_at: org.created_at.slice(0, 10),
    };
  });
  console.info(`[outreach] ${staff.email} downloaded the outreach list (${rows.length} organisations)`);
  const name = `studio1-outreach-${todayKey()}${orgs.truncated || contacts.truncated ? "-incomplete" : ""}.csv`;
  return new Response(toCsv(COLUMNS, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}
