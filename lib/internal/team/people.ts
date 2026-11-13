import { inList, insertRow, selectRows, updateRows } from "@/lib/supabase-server";
import { accessFor } from "@/lib/internal/members";
import { isOwner, isStaffEmail } from "@/lib/internal/roles";
import { emailAddress } from "@/lib/internal/token";
import { audit } from "@/lib/internal/team/audit";
import { deleteTeamFiles, saveTeamFile } from "@/lib/internal/team/files";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  TEAM_MIGRATION_HINT,
  cleanLines,
  isDateKey,
  isMissingTable,
  shortText,
  type PayLine,
  type PersonKind,
  type TeamPerson,
  type TeamPersonPay,
  type TeamResult,
} from "@/lib/internal/team/shared";

/**
 * The team roster (team_people): employees and interns with their employee
 * ID, name, photo and payslip defaults. No session checks here; the pages and
 * actions do that. Server only.
 */

const TABLE = "team_people";

/**
 * Everything but the salary lines. Reads that aren't for the Money pages ask
 * for these columns only, so pay never leaves the database for them.
 */
const PUBLIC_COLUMNS = "email,name,employee_code,photo_path,kind,designation,joined_on,reviewer,active,updated_at";

function toPerson(row: Record<string, unknown>): TeamPerson | null {
  if (typeof row.email !== "string") return null;
  return {
    email: row.email,
    name: typeof row.name === "string" ? row.name : "",
    employee_code: typeof row.employee_code === "string" && row.employee_code ? row.employee_code : null,
    photo_path: typeof row.photo_path === "string" && row.photo_path ? row.photo_path : null,
    kind: row.kind === "intern" ? "intern" : "employee",
    designation: typeof row.designation === "string" ? row.designation : "",
    joined_on: typeof row.joined_on === "string" ? row.joined_on : null,
    reviewer: typeof row.reviewer === "string" && row.reviewer ? row.reviewer : null,
    active: row.active !== false,
    updated_at: String(row.updated_at ?? ""),
  };
}

function toPersonPay(row: Record<string, unknown>): TeamPersonPay | null {
  const person = toPerson(row);
  return person ? { ...person, earnings: cleanLines(row.earnings), deductions: cleanLines(row.deductions) } : null;
}

/**
 * This person's own roster row (if active) and the interns whose days they
 * log. Quiet when the migration hasn't run: the dashboard works without it.
 */
export async function teamAccessFor(email: string): Promise<{ person: TeamPerson | null; interns: string[] }> {
  const result = await selectRows(
    TABLE,
    new URLSearchParams({
      select: PUBLIC_COLUMNS,
      or: `(email.eq."${email}",reviewer.eq."${email}")`,
      active: "eq.true",
      limit: "200",
    }),
  );
  if (!result.ok) {
    if (!isMissingTable(result.message)) console.error(`[team] reading ${TABLE} failed: ${result.message}`);
    return { person: null, interns: [] };
  }
  const people = result.rows.map(toPerson).filter((person): person is TeamPerson => person !== null);
  return {
    person: people.find((person) => person.email === email) ?? null,
    // Only staff log interns' days: an outside writer named as a reviewer
    // doesn't get the People page.
    interns: isStaffEmail(email)
      ? people.filter((person) => person.kind === "intern" && person.reviewer === email).map((person) => person.email)
      : [],
  };
}

export type PeopleResult = { ok: true; people: TeamPerson[] } | { ok: false; message: string; missing: boolean };

function peopleQuery(columns: string, options: { activeOnly?: boolean; emails?: string[] }) {
  const query = new URLSearchParams({ select: columns, order: "active.desc,name.asc,email.asc", limit: "500" });
  if (options.activeOnly) query.set("active", "eq.true");
  if (options.emails) query.set("email", inList(options.emails));
  return query;
}

function listError(message: string): { ok: false; message: string; missing: boolean } {
  const missing = isMissingTable(message);
  if (!missing) console.error(`[team] listing ${TABLE} failed: ${message}`);
  return { ok: false, missing, message: missing ? TEAM_MIGRATION_HINT : "Couldn't load the team." };
}

/** Everyone on the roster, active first, then by name. No salary lines. */
export async function listPeople(options: { activeOnly?: boolean; emails?: string[] } = {}): Promise<PeopleResult> {
  if (options.emails && options.emails.length === 0) return { ok: true, people: [] };
  const result = await selectRows(TABLE, peopleQuery(PUBLIC_COLUMNS, options));
  if (!result.ok) return listError(result.message);
  return { ok: true, people: result.rows.map(toPerson).filter((person): person is TeamPerson => person !== null) };
}

export type PeoplePayResult = { ok: true; people: TeamPersonPay[] } | { ok: false; message: string; missing: boolean };

/** The roster with salary lines, for payroll. Admin pages only. */
export async function listPeoplePay(): Promise<PeoplePayResult> {
  const result = await selectRows(TABLE, peopleQuery("*", {}));
  if (!result.ok) return listError(result.message);
  return { ok: true, people: result.rows.map(toPersonPay).filter((person): person is TeamPersonPay => person !== null) };
}

export async function getPerson(email: string): Promise<TeamPerson | null> {
  const result = await selectRows(TABLE, new URLSearchParams({ select: PUBLIC_COLUMNS, email: `eq.${email}`, limit: "1" }));
  return result.ok && result.rows[0] ? toPerson(result.rows[0]) : null;
}

/** One person with their salary lines, for payroll. Admin pages only. */
export async function getPersonPay(email: string): Promise<TeamPersonPay | null> {
  const result = await selectRows(TABLE, new URLSearchParams({ select: "*", email: `eq.${email}`, limit: "1" }));
  return result.ok && result.rows[0] ? toPersonPay(result.rows[0]) : null;
}

/* ----------------------------------------------------------------- input */

export type PersonInput = {
  email: string;
  name: string;
  employee_code: string | null;
  kind: PersonKind;
  designation: string;
  joined_on: string | null;
  reviewer: string | null;
  active: boolean;
};

/** Checks what an admin typed for a person; returns the clean row or why not. */
export function cleanPerson(input: Record<string, unknown>): { ok: true; person: PersonInput } | { ok: false; message: string } {
  const email = emailAddress(input.email);
  if (!email) return { ok: false, message: "Enter a valid email address." };
  const code = shortText(input.employee_code, 24);
  if (code && !/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(code)) {
    return { ok: false, message: "Employee IDs use letters, digits, - _ or / only." };
  }
  const joined = shortText(input.joined_on, 10);
  if (joined && !isDateKey(joined)) return { ok: false, message: "The joining date isn't a valid date." };
  const kind: PersonKind = input.kind === "intern" ? "intern" : "employee";
  const reviewerRaw = shortText(input.reviewer, 254);
  const reviewer = reviewerRaw ? emailAddress(reviewerRaw) : null;
  if (reviewerRaw && !reviewer) return { ok: false, message: "The reviewer needs a valid email address." };
  if (reviewer && reviewer === email) return { ok: false, message: "Someone can't review their own days." };
  return {
    ok: true,
    person: {
      email,
      name: shortText(input.name, 80),
      employee_code: code || null,
      kind,
      designation: shortText(input.designation, 80),
      joined_on: joined || null,
      reviewer: kind === "intern" ? reviewer : null,
      active: input.active !== false,
    },
  };
}

/**
 * Why this address can't log an intern's days, or null when it can. Naming a
 * reviewer lets them into the dashboard (the People page), so it has to be
 * someone at Studio1 who's still around: an owner, an active dashboard
 * member, or an active person on the team list.
 */
export async function reviewerProblem(reviewer: string): Promise<string | null> {
  if (!isStaffEmail(reviewer)) return "A reviewer needs an @studio1hq.com address.";
  if (isOwner(reviewer)) return null;
  const [access, person] = await Promise.all([accessFor(reviewer), getPerson(reviewer)]);
  if (access.kind === "member" && access.member.status === "disabled") return "That reviewer's dashboard access is turned off.";
  if (access.kind === "member" && access.member.status === "active" && access.member.roles.length > 0) return null;
  if (person?.active) return null;
  return "The reviewer has to be on the team list or have dashboard access first.";
}

function saveError(message: string): TeamResult {
  if (isMissingTable(message)) return { ok: false, message: TEAM_MIGRATION_HINT };
  if (message.includes("team_people_employee_code") || (message.includes("23505") && message.includes("employee_code"))) {
    return { ok: false, message: "Someone else already has that employee ID." };
  }
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/** Adds someone to the roster. */
export async function addPerson(person: PersonInput, by: string): Promise<TeamResult> {
  const result = await insertRow(TABLE, { ...person, updated_by: by });
  if (result.ok) {
    await audit({ actor: by, area: "people", action: "added", subject: person.email, detail: { ...person } });
    return { ok: true };
  }
  if (result.duplicate && !result.message.includes("employee_code")) {
    return { ok: false, message: "That person is already on the team list." };
  }
  console.error(`[team] adding ${person.email} failed: ${result.message}`);
  return saveError(result.message);
}

/** Changes someone's details; the email stays the same. `before` goes in the audit trail. */
export async function updatePerson(person: PersonInput, by: string, before?: TeamPerson | null): Promise<TeamResult> {
  const { email, ...rest } = person;
  const result = await updateRows(
    TABLE,
    new URLSearchParams({ email: `eq.${email}` }),
    { ...rest, updated_by: by, updated_at: new Date().toISOString() },
    "email",
  );
  if (!result.ok) {
    console.error(`[team] updating ${email} failed: ${result.message}`);
    return saveError(result.message);
  }
  if (!result.count) return { ok: false, message: "That person isn't on the team list." };
  if (before && (before.active !== person.active || before.reviewer !== person.reviewer || before.kind !== person.kind)) {
    await audit({
      actor: by,
      area: "people",
      action: "changed",
      subject: email,
      detail: {
        before: { active: before.active, reviewer: before.reviewer, kind: before.kind },
        after: { active: person.active, reviewer: person.reviewer, kind: person.kind },
      },
    });
  }
  return { ok: true };
}

/** Someone's own name, from My day. */
export async function updateOwnName(email: string, name: unknown): Promise<TeamResult> {
  const clean = shortText(name, 80);
  if (clean.length < 2) return { ok: false, message: "Enter your name." };
  if (/https?:|www\.|@|\d/.test(clean)) return { ok: false, message: "Use just your name: no links, emails or digits." };
  const result = await updateRows(
    TABLE,
    new URLSearchParams({ email: `eq.${email}` }),
    { name: clean, updated_by: email, updated_at: new Date().toISOString() },
    "email",
  );
  if (!result.ok) return saveError(result.message);
  return result.count ? { ok: true } : { ok: false, message: "You're not on the team list yet. Ask an admin to add you." };
}

/** A square 320px WebP of the upload, replacing the old photo. */
export async function setPhoto(email: string, file: File): Promise<TeamResult> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: `Photos can be ${MAX_UPLOAD_LABEL} at most.` };
  let webp: Buffer;
  try {
    const { default: sharp } = await import("sharp");
    webp = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 })
      .rotate()
      .resize(320, 320, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { ok: false, message: "That file isn't a photo we can use. Try a PNG, JPG or WebP." };
  }
  const before = await getPerson(email);
  if (!before) return { ok: false, message: "That person isn't on the team list." };
  const saved = await saveTeamFile("photos", crypto.randomUUID(), webp, "photo.webp");
  if (!saved.ok) return saved;
  const result = await updateRows(
    TABLE,
    new URLSearchParams({ email: `eq.${email}` }),
    { photo_path: saved.path, updated_at: new Date().toISOString() },
    "email",
  );
  if (!result.ok) {
    await deleteTeamFiles([saved.path]);
    return saveError(result.message);
  }
  await deleteTeamFiles([before.photo_path]);
  return { ok: true };
}

export async function removePhoto(email: string): Promise<TeamResult> {
  const before = await getPerson(email);
  if (!before?.photo_path) return { ok: true };
  const result = await updateRows(TABLE, new URLSearchParams({ email: `eq.${email}` }), { photo_path: null }, "email");
  if (!result.ok) return saveError(result.message);
  await deleteTeamFiles([before.photo_path]);
  return { ok: true };
}

/** The salary lines someone's next payslips start from. */
export async function savePayDefaults(
  email: string,
  lines: { earnings: PayLine[]; deductions: PayLine[] },
  by: string,
): Promise<TeamResult> {
  const before = await getPersonPay(email);
  const after = { earnings: cleanLines(lines.earnings), deductions: cleanLines(lines.deductions) };
  const result = await updateRows(
    TABLE,
    new URLSearchParams({ email: `eq.${email}` }),
    { ...after, updated_by: by, updated_at: new Date().toISOString() },
    "email",
  );
  if (!result.ok) return saveError(result.message);
  if (!result.count) return { ok: false, message: "That person isn't on the team list." };
  if (JSON.stringify(before ? { earnings: before.earnings, deductions: before.deductions } : null) !== JSON.stringify(after)) {
    await audit({
      actor: by,
      area: "payroll",
      action: "salary-lines",
      subject: email,
      detail: { before: before ? { earnings: before.earnings, deductions: before.deductions } : null, after },
    });
  }
  return { ok: true };
}
