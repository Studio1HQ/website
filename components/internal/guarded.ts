import { unstable_rethrow } from "next/navigation";

/**
 * What a form says when its save never got an answer: the connection
 * dropped, or a new version of the dashboard went live while the page was
 * open (its saves then no longer exist on the server until a reload).
 */
export const UNREACHED = "That didn't reach the dashboard. Check your connection and try again; if it keeps failing, reload the page.";

/**
 * A server action that answers `{ ok: false, message }` instead of throwing
 * when the request itself fails. A throw inside a transition lands on the
 * dashboard's error page (app/internal/(dashboard)/error.tsx) and whatever
 * was typed in the open form is gone; this way the form stays and says what
 * happened. Redirects the action asked for still go through.
 *
 * Wrap once, next to the import, and call it as before:
 *
 *   import { saveRecord as saveRecordAction } from "…/actions";
 *   const saveRecord = guarded(saveRecordAction);
 */
export function guarded<Args extends unknown[], Result extends { ok: boolean }>(
  action: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return (...args) =>
    action(...args).catch((error: unknown) => {
      // A redirect (or not-found) is Next's to handle, not a failed save.
      unstable_rethrow(error);
      console.error("[internal] a save didn't reach the server", error);
      // Every action result has a `{ ok: false, message }` side.
      return { ok: false, message: UNREACHED } as unknown as Result;
    });
}
