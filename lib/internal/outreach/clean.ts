import { cleanField } from "@/lib/internal/community/clean";
import type { FieldDef } from "@/lib/internal/community/schema";
import { looksLikeSecret } from "@/lib/internal/clients/clean";

/**
 * Turns a form's values into the row to write, against a field list from
 * schema.ts. "create" needs the required fields; "update" changes only the
 * fields it's given. The field checks themselves are Community's
 * (cleanField), so a date, a link or an amount means the same thing in
 * both places.
 */

export type CleanResult = { ok: true; row: Record<string, unknown> } | { ok: false; message: string };

const SECRET =
  "That looks like a password or a key. Don't store those here: share them in a password manager.";

function blank(value: unknown) {
  return value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

export function cleanFields(
  fields: readonly FieldDef[],
  input: Record<string, unknown>,
  mode: "create" | "update",
): CleanResult {
  const row: Record<string, unknown> = {};
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(input, field.key)) {
      if (mode === "create" && field.required) return { ok: false, message: `${field.label} is needed.` };
      continue;
    }
    const result = cleanField(field, input[field.key]);
    if (!result.ok) return result;
    if (field.required && blank(result.value)) return { ok: false, message: `${field.label} is needed.` };
    // Notes and next steps get pasted into: keep credentials out of them.
    if (typeof result.value === "string" && looksLikeSecret(result.value)) return { ok: false, message: SECRET };
    row[field.key] = result.value;
  }
  return { ok: true, row };
}

/** One line of typed text, cut to length; "" for anything that isn't text. */
export function oneLine(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A block of typed text with its line breaks, cut to length. */
export function block(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";
}

export { looksLikeSecret, SECRET as SECRET_MESSAGE };
