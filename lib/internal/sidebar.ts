/**
 * Remembers the desktop sidebar folded down to its icons, so the dashboard
 * is drawn that way from the first paint instead of opening and then folding.
 */
export const SIDEBAR_COOKIE = "internal_sidebar";

export function isSidebarCollapsed(value: string | undefined) {
  return value === "collapsed";
}

/**
 * Folding is one motion: the sidebar's width, the edge button, the fading
 * text and the folding group titles all share this timing and curve.
 * Pair it with a transition-[…] class naming what moves.
 */
export const SIDEBAR_EASE =
  "duration-220 ease-drawer motion-reduce:transition-none";

/** Text that fades out as the desktop sidebar folds. */
export const SIDEBAR_FADE =
  "transition-opacity duration-220 ease-drawer motion-reduce:transition-none md:group-data-[collapsed=true]/sidebar:opacity-0";
