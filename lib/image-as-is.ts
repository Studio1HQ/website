import type { StaticImageData } from "next/image";

/**
 * Images served as-is, skipping Vercel's Image Optimization.
 *
 * Nov 2026: the project used up its image optimization allowance, so Vercel
 * answers 402 ("OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED") for any image it
 * hasn't optimized before. Images optimized earlier still load from its
 * cache, but these, added after, showed as broken. They're already small
 * WebP files (under 35 KB), so serving them as they are costs nothing.
 *
 * Matched by file name, so both a public path ("/assets/logos/x.webp") and a
 * static import ("/_next/static/media/x.3f2a1b.webp") count. Once the
 * allowance is back, this list can go.
 */
const AS_IS = ["copilotkit-mark", "Nathan", "entelligence-homepage"];

const pattern = new RegExp(`(^|/)(${AS_IS.join("|")})\\.[^/]*$`);

/** Whether this image skips the optimizer (pass to next/image's `unoptimized`). */
export function servedAsIs(
  src: string | StaticImageData | null | undefined,
): boolean {
  const path = typeof src === "string" ? src : src?.src;
  return Boolean(path && pattern.test(path.split("?")[0]));
}
