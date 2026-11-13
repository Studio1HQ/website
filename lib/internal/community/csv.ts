import { cleanEmail } from "@/lib/internal/community/clean";
import { isDateKey } from "@/lib/internal/community/schema";

/**
 * Reads a guest list exported from Luma, Meetup, Google Forms, Eventbrite
 * or a spreadsheet: finds the name, email, college or company, status and
 * check-in columns by their headers. Pure; the import action merges the
 * result into the event's guest list.
 */

/**
 * The biggest guest list to send for import, in bytes. Server actions take
 * 4 MB at most (next.config.ts), and the request carries more than the
 * file, so this stays well under it.
 */
export const MAX_CSV_BYTES = 3_500_000;

/** How many bytes a piece of text takes once sent (UTF-8). */
export function byteLength(text: string) {
  return new TextEncoder().encode(text).length;
}

/**
 * One cell for a CSV file. A cell that starts with = + - @, a tab or a
 * return gets a leading apostrophe: Excel and Sheets would otherwise run
 * it as a formula, and guests type their own names. Quotes, commas and
 * line breaks are quoted.
 */
export function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The header row's separator: tabs, semicolons (European Excel) or commas. */
function separatorOf(firstLine: string) {
  const count = (char: string) => firstLine.split(char).length - 1;
  const commas = count(",");
  const semicolons = count(";");
  if (count("\t") > 0 && commas === 0 && semicolons === 0) return "\t";
  return semicolons > commas ? ";" : ",";
}

/**
 * Rows of cells from CSV text (commas, semicolons or tabs between cells),
 * quotes handled.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\ufeff/, "");
  const firstLine = source.slice(0, source.search(/\r?\n|$/));
  const separator = separatorOf(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

export type ImportedGuest = {
  email: string;
  name: string;
  organisation: string;
  /** Null when the file has no status or check-in column. */
  status:
    | "registered"
    | "confirmed"
    | "waitlisted"
    | "attended"
    | "no_show"
    | "cancelled"
    | null;
  role:
    | "attendee"
    | "speaker"
    | "mentor"
    | "judge"
    | "volunteer"
    | "organiser"
    | null;
  checkedInAt: string | null;
};

export type GuestImport =
  | {
      ok: true;
      guests: ImportedGuest[];
      /** Rows without a usable email. */
      skipped: number;
      /**
       * Rows whose check-in cell wasn't a yes, a no or a date we can read.
       * They are imported as not checked in.
       */
      unreadCheckIns: number;
      /** Which columns were found, for the preview. */
      columns: {
        name: boolean;
        organisation: boolean;
        status: boolean;
        checkIn: boolean;
        role: boolean;
      };
    }
  | { ok: false; message: string };

const key = (header: string) => header.toLowerCase().replace(/[^a-z]/g, "");

const HEADERS = {
  email: [
    "email",
    "emailaddress",
    "attendeeemail",
    "guestemail",
    "youremail",
    "mail",
  ],
  name: [
    "name",
    "fullname",
    "attendeename",
    "guestname",
    "yourname",
    "participantname",
  ],
  first: ["firstname", "givenname"],
  last: ["lastname", "surname", "familyname"],
  organisation: [
    "company",
    "companyname",
    "organisation",
    "organization",
    "college",
    "collegename",
    "university",
    "institution",
    "institute",
    "school",
  ],
  status: [
    "approvalstatus",
    "status",
    "ticketstatus",
    "rsvp",
    "rsvpstatus",
    "attendeestatus",
  ],
  checkIn: [
    "checkedinat",
    "checkedin",
    "checkin",
    "checkintime",
    "attended",
    "checkedintime",
  ],
  role: ["role", "guestrole", "attendeerole"],
};

function find(headers: string[], names: readonly string[]) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}

const NO =
  /^(|no|n|false|0|-|—|–|none|null|n\/a|not checked in|not attended|absent|no show|no-show|pending|declined)$/i;
const YES = /^(yes|y|true|1|x|✓|✔|checked in|checked-in|attended|present)$/i;

/** 2026-11-10, then optionally T13:05, :00, .000 and Z or +05:30. */
const TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?\s?(Z|[+-]\d{2}:?\d{2})?)?$/i;

export type CheckIn =
  /** Checked in; `at` is the time when the file gave one. */
  | { attended: true; at: string | null }
  /** Not checked in. `unread`: the cell had something we couldn't read. */
  | { attended: false; unread: boolean };

/**
 * Reads a check-in cell. Only a plain yes or a full date counts as checked
 * in; anything else ("Absent", "Maybe", "13/11 6pm") doesn't, because a
 * check-in is never undone by a later import. A time without a zone is
 * IST, where the team's events are.
 */
export function readCheckIn(value: string, now = new Date()): CheckIn {
  const text = value.trim();
  if (NO.test(text)) return { attended: false, unread: false };
  if (YES.test(text)) return { attended: true, at: null };
  const match = text.match(TIMESTAMP);
  if (!match) return { attended: false, unread: true };
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const zone = match[7]
    ? match[7].toUpperCase() === "Z"
      ? "Z"
      : match[7].replace(/^([+-]\d{2}):?(\d{2})$/, "$1:$2")
    : "+05:30";
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${zone}`,
  );
  // A real day (no 31 February), not before 2010 and not more than a day
  // ahead.
  if (
    !isDateKey(`${year}-${month}-${day}`) ||
    Number.isNaN(date.getTime()) ||
    Number(year) < 2010 ||
    date.getTime() > now.getTime() + 86_400_000
  ) {
    return { attended: false, unread: true };
  }
  return { attended: true, at: date.toISOString() };
}

function statusFrom(value: string): ImportedGuest["status"] {
  const text = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!text) return null;
  if (/^(attended|checked_in|present|yes_attended)$/.test(text))
    return "attended";
  if (/^(no_?show|absent|did_not_attend)$/.test(text)) return "no_show";
  if (/wait/.test(text)) return "waitlisted";
  if (
    /^(declined|rejected|cancel+ed|not_going|refunded|invited_declined)$/.test(
      text,
    )
  )
    return "cancelled";
  if (/^(confirmed)$/.test(text)) return "confirmed";
  if (
    /^(approved|going|registered|accepted|yes|attending|pending_approval|pending|invited)$/.test(
      text,
    )
  )
    return "registered";
  return null;
}

function roleFrom(value: string): ImportedGuest["role"] {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (/speaker|panel/.test(text)) return "speaker";
  if (/mentor/.test(text)) return "mentor";
  if (/judge/.test(text)) return "judge";
  if (/volunteer/.test(text)) return "volunteer";
  if (/organi[sz]er|host/.test(text)) return "organiser";
  return "attendee";
}

export function guestsFromCsv(text: string, limit = 5000): GuestImport {
  const rows = parseCsv(text);
  if (rows.length < 2)
    return {
      ok: false,
      message: "The file needs a header row and at least one guest.",
    };
  const headers = rows[0].map(key);
  const at = {
    email: find(headers, HEADERS.email),
    name: find(headers, HEADERS.name),
    first: find(headers, HEADERS.first),
    last: find(headers, HEADERS.last),
    organisation: find(headers, HEADERS.organisation),
    status: find(headers, HEADERS.status),
    checkIn: find(headers, HEADERS.checkIn),
    role: find(headers, HEADERS.role),
  };
  if (at.email === -1)
    return {
      ok: false,
      message: 'Couldn\'t find an email column. Name its header "email".',
    };
  if (rows.length - 1 > limit)
    return {
      ok: false,
      message: `That's more than ${limit.toLocaleString("en-IN")} guests. Split the file.`,
    };

  const cell = (row: string[], index: number) =>
    index === -1 ? "" : (row[index] ?? "").trim();
  const byEmail = new Map<string, ImportedGuest>();
  let skipped = 0;
  let unreadCheckIns = 0;
  for (const row of rows.slice(1)) {
    const email = cleanEmail(cell(row, at.email));
    if (!email) {
      skipped++;
      continue;
    }
    const name =
      cell(row, at.name) ||
      [cell(row, at.first), cell(row, at.last)].filter(Boolean).join(" ");
    const checkIn =
      at.checkIn === -1 ? null : readCheckIn(cell(row, at.checkIn));
    let status = at.status === -1 ? null : statusFrom(cell(row, at.status));
    if (checkIn?.attended) status = "attended";
    else if (status === null && at.checkIn !== -1) status = "registered";
    if (checkIn && !checkIn.attended && checkIn.unread) unreadCheckIns++;
    byEmail.set(email, {
      email,
      name: name.replace(/\s+/g, " ").slice(0, 120),
      organisation: cell(row, at.organisation)
        .replace(/\s+/g, " ")
        .slice(0, 160),
      status,
      role: at.role === -1 ? null : roleFrom(cell(row, at.role)),
      checkedInAt: checkIn?.attended ? checkIn.at : null,
    });
  }
  return {
    ok: true,
    guests: [...byEmail.values()],
    skipped,
    unreadCheckIns,
    columns: {
      name: at.name !== -1 || at.first !== -1,
      organisation: at.organisation !== -1,
      status: at.status !== -1,
      checkIn: at.checkIn !== -1,
      role: at.role !== -1,
    },
  };
}

const RANK: Record<string, number> = {
  cancelled: 0,
  waitlisted: 1,
  registered: 2,
  confirmed: 3,
  no_show: 4,
  attended: 5,
};

/**
 * The status to keep when a guest is imported again: a fresh export can
 * cancel or move someone along, but never undo a check-in made at the door.
 */
export function mergedStatus(
  existing: string | undefined,
  imported: ImportedGuest["status"],
) {
  if (!imported) return existing ?? "registered";
  if (!existing) return imported;
  if (
    (existing === "attended" || existing === "no_show") &&
    imported !== "attended"
  )
    return existing;
  if (imported === "cancelled") return "cancelled";
  return (RANK[imported] ?? 0) >= (RANK[existing] ?? 0) ? imported : existing;
}
