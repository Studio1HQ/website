import { revalidateTag } from "next/cache";

/**
 * The dashboard keeps each form table's list read for a short while
 * (lib/internal/data.ts), so opening a list, filtering it or stepping
 * through entries doesn't read the whole table again every time. This file
 * has no other imports, so the public form routes can use it too.
 */

/** On every kept read of a form table (and the views built on them). */
export const SECTIONS_TAG = "internal-sections";

/** How long a read is kept when nothing says it changed. */
export const SECTIONS_KEEP_SECONDS = 30;

/**
 * Call after anything writes to a form table (a new submission, a status,
 * tags, notes, a purge): the next read goes to the database. Only works in
 * a server action or a route handler; anywhere else it does nothing and the
 * kept read simply runs out on its own.
 */
export function sectionsChanged() {
  try {
    revalidateTag(SECTIONS_TAG, { expire: 0 });
  } catch {
    // Outside a request (a test, a script): nothing is kept there anyway.
  }
}
