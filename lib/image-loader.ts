"use client";

import { imageUrl } from "./image-url";

export { imageWidth } from "./image-url";

/**
 * Every next/image on the site goes through this loader instead of Vercel's
 * Image Optimization (which has a monthly cap: past it, new images 402). The
 * rules live in lib/image-url.ts, which server components can call too.
 */
export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  return imageUrl({ src, width });
}
