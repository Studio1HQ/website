import type { Guest, GuestCounts } from "@/lib/internal/community/schema";

/**
 * A hackathon event's door list: its guest list (imports, speakers,
 * mentors, walk-ins) and its site registrations in one list, so the team
 * checks people in from one place. Registrations stay in
 * hackathon_registrations (checking one in sets its review status to
 * attended); nothing is copied between the tables. Plain data, safe for
 * client components.
 */

/** What the door list needs from a site registration. */
export type SiteRegistration = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  github: string;
  team: string;
  team_name: string;
  track: string;
  review_status: string;
};

export type DoorRow = {
  /** Unique across both sources: "g:<id>" or "r:<id>". */
  key: string;
  source: "guest" | "site";
  id: string;
  name: string;
  email: string;
  /** The line under the name: organisation, or GitHub, team and track. */
  detail: string;
  /** Guest role (attendee, speaker…); site registrations are attendees. */
  role: string;
  /** In the guest list's words, so the views and counts work on both. */
  status: string;
  /** The registration's own review status. */
  reviewStatus?: string;
  checked_in_at: string | null;
  created_at: string;
  /** The guest record, for its edit dialog. */
  guest?: Guest;
};

/** Registration review status → guest-list status. */
const AS_GUEST: Record<string, string> = {
  new: "registered",
  confirmed: "confirmed",
  waitlisted: "waitlisted",
  attended: "attended",
  no_show: "no_show",
  rejected: "cancelled",
  withdrawn: "cancelled",
};

export function doorStatus(reviewStatus: string) {
  return AS_GUEST[reviewStatus] ?? "registered";
}

/**
 * Both lists, oldest sign-up first. Someone who registered on the site and
 * is also on an imported list shows once, as their registration; guests in
 * another role (speaker, mentor, judge…) stay as they are.
 */
export function doorRows(guests: readonly Guest[], registrations: readonly SiteRegistration[]): DoorRow[] {
  const siteEmails = new Set(registrations.map((item) => item.email.trim().toLowerCase()));
  const rows: DoorRow[] = registrations.map((item) => {
    const github = item.github.replace(/^@/, "");
    return {
      key: `r:${item.id}`,
      source: "site",
      id: item.id,
      name: item.name,
      email: item.email,
      detail: [github ? `@${github}` : "", item.team_name, item.track].filter(Boolean).join(" · "),
      role: "attendee",
      status: doorStatus(item.review_status),
      reviewStatus: item.review_status,
      checked_in_at: null,
      created_at: item.created_at,
    };
  });
  for (const guest of guests) {
    if (guest.role === "attendee" && siteEmails.has(guest.email.trim().toLowerCase())) continue;
    rows.push({
      key: `g:${guest.id}`,
      source: "guest",
      id: guest.id,
      name: guest.name,
      email: guest.email,
      detail: guest.organisation,
      role: guest.role,
      status: guest.status,
      checked_in_at: guest.checked_in_at,
      created_at: guest.created_at,
      guest,
    });
  }
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.key.localeCompare(b.key));
}

/** Turnout numbers for the merged list, each person counted once. */
export function doorCounts(rows: readonly Pick<DoorRow, "status">[]): GuestCounts {
  return {
    signed_up: rows.filter((row) => row.status !== "cancelled").length,
    attended: rows.filter((row) => row.status === "attended").length,
    waitlisted: rows.filter((row) => row.status === "waitlisted").length,
    no_show: rows.filter((row) => row.status === "no_show").length,
  };
}
