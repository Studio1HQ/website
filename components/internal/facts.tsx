import { isValidElement, type ReactNode } from "react";

/**
 * "12 follow-ups due" → { value: "12", label: "Follow-ups due" }: a fact that
 * starts with its number splits into the two; anything else stays whole.
 */
const NUMBER = "[₹$€£]?[\\d.,]+[kKmM%+]?";
const LEADING = new RegExp(`^(${NUMBER}(?: of ${NUMBER})?)\\s+(.+)$`);

function split(note: string): { value: string; label: string } | null {
  const match = note.match(LEADING);
  if (!match) return null;
  const [, value, rest] = match;
  return { value, label: rest.charAt(0).toUpperCase() + rest.slice(1) };
}

/** A fact's words, also when it came wrapped (a highlighted count). */
function textOf(note: ReactNode): string | null {
  if (typeof note === "string") return note;
  if (isValidElement<{ children?: ReactNode }>(note)) {
    // "{count} claims waiting" arrives as [3, " claims waiting"]
    const parts = ([] as ReactNode[]).concat(note.props.children);
    if (parts.every((part) => typeof part === "string" || typeof part === "number")) return parts.join("");
  }
  return null;
}

/**
 * A card's facts as a short table: what it is on the left, quiet, and its
 * number on the right, so a glance down the column reads them all. Three at
 * most; the area's own page has the rest.
 */
export function Facts({ notes, max = 3 }: { notes: ReactNode[]; max?: number }) {
  const shown = notes.filter(Boolean).slice(0, max);
  if (!shown.length) return null;
  return (
    <dl className="mt-4 divide-y divide-[var(--i-line)] border-t border-[var(--i-line)] text-[13px]">
      {shown.map((note, index) => {
        const words = textOf(note);
        const parts = words ? split(words) : null;
        return (
          <div key={index} className="flex items-center justify-between gap-3 py-2">
            {parts ? (
              <>
                <dt className="min-w-0 truncate text-[var(--i-muted)]">{parts.label}</dt>
                <dd className="shrink-0 font-medium tabular-nums text-[var(--i-ink)]">{parts.value}</dd>
              </>
            ) : (
              <dt className="min-w-0 truncate text-[var(--i-muted)]">{note}</dt>
            )}
          </div>
        );
      })}
    </dl>
  );
}
