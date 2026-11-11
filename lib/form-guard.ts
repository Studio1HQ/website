/**
 * Cheap bot checks shared by the public forms. A submission looks automated
 * when the hidden honeypot field is filled, or when it arrives faster than a
 * person could fill the form. Callers answer "ok" without saving, so bots
 * get no signal to adapt to.
 */

/** No one fills in a real form in under three seconds. */
export const MIN_FILL_MS = 3000;

export function looksAutomated({
  honeypot,
  fillMs,
}: {
  honeypot: unknown;
  /** Milliseconds between the form appearing and submit, measured in the browser. */
  fillMs: unknown;
}) {
  if (typeof honeypot === "string" && honeypot.trim() !== "") return true;
  const elapsed = Number(fillMs);
  return !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS;
}
