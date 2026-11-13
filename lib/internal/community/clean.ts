import {
  CURRENCIES,
  channelKey,
  isDateKey,
  todayKey,
  type EntityDef,
  type EntityKey,
  type FieldDef,
} from "@/lib/internal/community/schema";

/**
 * Checks what someone typed into a community form against the record's
 * field list (schema.ts) and turns it into a row for Supabase. Pure, so the
 * rules are easy to test; the server actions call it before every write.
 */

type Input = Record<string, unknown>;
type FieldResult =
  { ok: true; value: unknown } | { ok: false; message: string };
export type CleanResult =
  { ok: true; row: Record<string, unknown> } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function raw(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return typeof value === "string" ? value : "";
}

function oneLine(value: unknown, max: number) {
  return raw(value).replace(/\s+/g, " ").trim().slice(0, max);
}

/** "1,20,000", "₹ 5000", "$1.5k" → a number; "" → null; nonsense → NaN. */
export function parseAmount(value: unknown): number | null {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : Number.NaN;
  const text = raw(value)
    .trim()
    .toLowerCase()
    .replace(/[,\s₹$€£]|inr|usd|eur|gbp|sgd|aed|rs\.?/g, "");
  if (!text) return null;
  const match = text.match(/^(\d+(?:\.\d+)?)(k|l|lakh|cr)?$/);
  if (!match) return Number.NaN;
  const scale = { k: 1e3, l: 1e5, lakh: 1e5, cr: 1e7 }[match[2] ?? ""] ?? 1;
  return Math.round(Number(match[1]) * scale * 100) / 100;
}

export function cleanUrl(value: unknown): string | null | undefined {
  const text = raw(value).trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (!url.hostname.includes(".")) return undefined;
    return url.toString().slice(0, 500);
  } catch {
    return undefined;
  }
}

export function cleanEmail(value: unknown): string | null | undefined {
  const text = raw(value)
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, "");
  if (!text) return null;
  return text.length <= 254 && EMAIL.test(text) ? text : undefined;
}

export function cleanTags(value: unknown): string[] {
  const list = Array.isArray(value) ? value.map(raw) : raw(value).split(",");
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of list) {
    const tag = item.replace(/\s+/g, " ").trim().slice(0, 32);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
    if (tags.length === 12) break;
  }
  return tags;
}

export function cleanField(field: FieldDef, value: unknown): FieldResult {
  const bad = (message: string): FieldResult => ({ ok: false, message });
  switch (field.type) {
    case "text":
      return { ok: true, value: oneLine(value, field.max ?? 200) };
    case "textarea":
      return {
        ok: true,
        value: raw(value)
          .replace(/\r\n?/g, "\n")
          .trim()
          .slice(0, field.max ?? 5000),
      };
    case "select": {
      const text = raw(value).trim();
      if (!text)
        return {
          ok: true,
          value: field.initial ?? field.options?.[0]?.value ?? "",
        };
      return field.options?.some((option) => option.value === text)
        ? { ok: true, value: text }
        : bad(`Pick a valid ${field.label.toLowerCase()}.`);
    }
    case "currency": {
      const text = raw(value).trim().toUpperCase();
      // Blank means rupees; anything else has to be a currency we know, so
      // a typo never turns dollars into rupees.
      if (!text) return { ok: true, value: "INR" };
      return CURRENCIES.some((option) => option.value === text)
        ? { ok: true, value: text }
        : bad(`Pick a valid ${field.label.toLowerCase()}.`);
    }
    case "date": {
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      return isDateKey(text)
        ? { ok: true, value: text }
        : bad(`${field.label} isn't a valid date.`);
    }
    case "time": {
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (!match || Number(match[1]) > 23 || Number(match[2]) > 59)
        return bad(`${field.label} isn't a valid time.`);
      return { ok: true, value: `${match[1].padStart(2, "0")}:${match[2]}` };
    }
    case "int": {
      const text = raw(value).replace(/[,\s]/g, "");
      if (!text) return { ok: true, value: null };
      // Digits only: Number() would also take "0x10" and "1e3".
      const number = /^\d{1,9}$/.test(text) ? Number(text) : Number.NaN;
      return Number.isInteger(number) && number >= 0 && number <= 100_000_000
        ? { ok: true, value: number }
        : bad(`${field.label} needs a whole number.`);
    }
    case "money": {
      const amount = parseAmount(value);
      if (amount === null) return { ok: true, value: null };
      return Number.isFinite(amount) && amount >= 0 && amount < 1e10
        ? { ok: true, value: amount }
        : bad(`${field.label} needs an amount, like 25000.`);
    }
    case "email": {
      const email = cleanEmail(value);
      return email === undefined
        ? bad(`${field.label} isn't a valid email address.`)
        : { ok: true, value: email };
    }
    case "url": {
      const url = cleanUrl(value);
      return url === undefined
        ? bad(`${field.label} needs a web link.`)
        : { ok: true, value: url };
    }
    case "owner": {
      const text = oneLine(value, 120);
      if (!text) return { ok: true, value: null };
      return {
        ok: true,
        value: text.includes("@") ? text.toLowerCase() : text,
      };
    }
    case "tags":
      return { ok: true, value: cleanTags(value) };
    case "ref": {
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      if (field.ref === "hackathon") {
        return SLUG.test(text)
          ? { ok: true, value: text }
          : bad(`Pick a valid ${field.label.toLowerCase()}.`);
      }
      return isUuid(text)
        ? { ok: true, value: text.toLowerCase() }
        : bad(`Pick a valid ${field.label.toLowerCase()}.`);
    }
    case "bool":
      return {
        ok: true,
        value:
          value === true || value === "true" || value === "on" || value === "1",
      };
    case "channel": {
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      const key = channelKey(text);
      return key
        ? { ok: true, value: key }
        : bad("Name the channel, like Discord or LinkedIn.");
    }
  }
}

function blank(value: unknown) {
  return (
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * The row to write. "create" fills every field it's given and needs the
 * required ones; "update" changes only the fields it's given.
 */
export function cleanRecord(
  def: EntityDef,
  input: Input,
  mode: "create" | "update",
): CleanResult {
  const row: Record<string, unknown> = {};
  for (const field of def.fields) {
    const given = Object.prototype.hasOwnProperty.call(input, field.key);
    if (!given) {
      if (mode === "create" && field.required)
        return { ok: false, message: `${field.label} is needed.` };
      continue;
    }
    const result = cleanField(field, input[field.key]);
    if (!result.ok) return result;
    if (field.required && blank(result.value))
      return { ok: false, message: `${field.label} is needed.` };
    row[field.key] = result.value;
  }

  // Rules across fields. A change only carries some of the fields, so the
  // rules that need the whole record run again in updateRecord, against
  // the saved row with the change laid over it.
  const problem = crossFieldError(def.key, row, mode === "create");
  if (problem) return { ok: false, message: problem };
  return { ok: true, row };
}

/**
 * Rules that span fields, or null when the record is fine. `whole` says
 * the record has every field (a new one, or a saved row with a change laid
 * over it); without it only the rules that can be judged from the fields
 * given are checked.
 */
export function crossFieldError(
  entity: EntityKey,
  row: Record<string, unknown>,
  whole: boolean,
  today = todayKey(),
): string | null {
  if (
    entity === "event" &&
    isDateKey(row.starts_on) &&
    isDateKey(row.ends_on) &&
    row.ends_on < row.starts_on
  ) {
    return "The event can't end before it starts.";
  }
  if (
    entity === "activity" &&
    isDateKey(row.happened_on) &&
    row.happened_on > today
  ) {
    return "That date hasn't happened yet. Log it once it has.";
  }
  if (!whole) return null;
  if (
    entity === "contact" &&
    [row.sponsor_id, row.partner_id].filter(Boolean).length !== 1
  ) {
    return "A contact belongs to one sponsor or one partner.";
  }
  if (
    entity === "activity" &&
    ![row.sponsor_id, row.partner_id, row.event_id].some(Boolean)
  ) {
    return "A note belongs to a sponsor, a partner or an event.";
  }
  return null;
}

/**
 * The time stamp that goes with a status: when a task was finished, when a
 * guest was checked in. Only when the status really changes, so fixing a
 * typo in a guest's name doesn't move their check-in time to now. Returns
 * the columns to add to the change ({} for none).
 */
export function statusStamps(
  entity: EntityKey,
  before: string | null | undefined,
  after: unknown,
  now: string,
): Record<string, string | null> {
  const stamp =
    entity === "task"
      ? { column: "completed_at", on: "done" }
      : entity === "guest"
        ? { column: "checked_in_at", on: "attended" }
        : null;
  if (!stamp || typeof after !== "string" || after === before) return {};
  return { [stamp.column]: after === stamp.on ? now : null };
}

/**
 * True when making `parentId` the parent of `id` would loop: it is `id`
 * itself, or already sits somewhere under it. `parents` maps each record
 * to its current parent.
 */
export function wouldLoop(
  id: string,
  parentId: string,
  parents: ReadonlyMap<string, string | null>,
) {
  const seen = new Set<string>();
  let current: string | null | undefined = parentId;
  while (current && !seen.has(current)) {
    if (current === id) return true;
    seen.add(current);
    current = parents.get(current);
  }
  return false;
}
