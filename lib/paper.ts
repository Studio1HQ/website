import type { CSSProperties } from "react";

/** Paper canvas palette (fixed, independent of the site theme). */
export const PAPER = "#f4efe7";
export const INK = "#141414";
/** Near-black used for the dark bands that alternate with the paper. */
export const NIGHT = "#0d0d0d";
export const PRINT = "#f97316";

/** Fine paper grain, as a tiny inline SVG noise tile. */
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/**
 * Pins a subtree to the paper sheet whatever the site theme: the paper tone
 * variables, plus the site's own colour tokens remapped so shared components
 * (prose, MDX blocks, share links) print in ink on paper.
 */
export const PAPER_SCOPE = {
  colorScheme: "light",
  background: PAPER,
  color: INK,
  "--p-bg": PAPER,
  "--p-fg": INK,
  "--p-muted": "rgba(20,20,20,0.62)",
  "--p-faint": "rgba(20,20,20,0.32)",
  "--p-line": "rgba(20,20,20,0.14)",
  "--p-card": "#ffffff",
  "--p-invert": 0,
  "--home-cream": PAPER,
  "--home-paper": "#ffffff",
  "--home-ink": INK,
  "--home-ink-soft": "rgba(20,20,20,0.62)",
  "--home-line": "rgba(20,20,20,0.14)",
  "--background": "36 33% 93%",
  "--foreground": "0 0% 8%",
  "--card": "0 0% 100%",
  "--card-foreground": "0 0% 8%",
  "--muted": "36 25% 89%",
  "--muted-foreground": "0 0% 38%",
  "--border": "33 16% 82%",
} as CSSProperties;

/** Routes drawn in the paper design (cream sheet, ink type, print orange); the blog is matched separately. */
const PAPER_PATHS = new Set([
  "/",
  "/careers",
  "/terms",
  "/privacy",
  "/about-us",
  "/product",
  "/case-studies",
  "/devrel-jobs",
  "/technical-content-marketing",
  "/developer-relations-growth-campaigns",
  "/developer-video-production",
  "/developer-documentation-dx-audit",
]);

/** Drops the locale prefix, so "/fr/careers" reads as "/careers". */
export function unprefixPath(pathname: string) {
  return pathname.replace(/^\/(fr|es|hi|zh)(?=\/|$)/, "") || "/";
}

/** Whether the navbar, menus and footer should use the paper style here. */
export function isPaperPath(pathname: string) {
  const path = unprefixPath(pathname);
  return (
    PAPER_PATHS.has(path) ||
    /^\/blog(\/|$)/.test(path) ||
    /^\/careers\/[^/]+\/?$/.test(path) ||
    /^\/case-studies\/[^/]+\/?$/.test(path)
  );
}
