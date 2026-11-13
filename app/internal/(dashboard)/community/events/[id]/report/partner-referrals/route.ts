import { toCsv } from "@/lib/internal/csv";
import { hackathonRegistrationsFor } from "@/lib/internal/data";
import { SECTIONS } from "@/lib/internal/sections";
import { requireCommunity, requireSection } from "@/lib/internal/session";
import { getRecord } from "@/lib/internal/community/data";
import { istDay } from "@/lib/internal/community/report";
import type { CommunityEvent } from "@/lib/internal/community/schema";

const COLUMNS = [
  "name",
  "email",
  "github",
  "country",
  "role",
  "experience",
  "team",
  "team_name",
  "track",
  "status",
  "registered_on",
];

/**
 * A hackathon event's participants who ticked "Share my details with this
 * hackathon's partners", for handing to its sponsors and partners. Rejected
 * and withdrawn registrations are left out. Community managers (and
 * admins) only, like the other hackathon exports.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireCommunity("manager");
  await requireSection(SECTIONS.hackathons, "export");
  const event = await getRecord<CommunityEvent>("event", (await params).id);
  if (!event?.hackathon_slug) return new Response("Not found", { status: 404 });
  const registrations = await hackathonRegistrationsFor(event.hackathon_slug);
  if (!registrations.ok) return new Response(registrations.message, { status: 502 });

  const rows = registrations.rows
    .filter(
      (row) => row.partner_consent === true && row.review_status !== "rejected" && row.review_status !== "withdrawn",
    )
    .map((row) => ({
      name: row.name,
      email: row.email,
      github: row.github,
      country: row.country,
      role: row.role,
      experience: row.experience,
      team: row.team,
      team_name: row.team_name,
      track: row.track,
      status: row.review_status,
      registered_on: istDay(String(row.created_at ?? "")),
    }));
  console.info(`[community] ${staff.email} downloaded ${rows.length} partner referrals for ${event.hackathon_slug}`);

  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return new Response(toCsv(COLUMNS, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${event.hackathon_slug}-partner-referrals-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
