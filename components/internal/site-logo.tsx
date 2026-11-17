"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { siteHost } from "@/lib/internal/clients/logo-pick";

/**
 * A company's logo: its website's icon, served by one of our logo routes
 * (`path`, e.g. /internal/clients/<slug>/logo), or the first letter of its
 * name when there's no website or no icon. The route is linked with
 * ?v=<host>, so a new website gets a new URL and the old icon isn't reused.
 */
export function SiteLogo({
  path,
  name,
  website,
  size = 24,
  className,
}: {
  path: string;
  name: string;
  website: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const host = siteHost(website);
  const [failed, setFailed] = useState<string | null>(null);
  const ref = useRef<HTMLImageElement>(null);
  const src = host ? `${path}?v=${encodeURIComponent(host)}` : null;

  // An image that failed before the page hydrated never calls onError.
  useEffect(() => {
    const image = ref.current;
    if (!image || !src || !image.complete) return;
    image.decode().catch(() => setFailed(src));
  }, [src]);

  const box = cn(
    "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-[22%] ring-1",
    className,
  );

  if (!src || failed === src) {
    return (
      <span
        aria-hidden
        className={cn(box, "bg-[var(--i-sunken)] font-medium text-[var(--i-muted)] ring-[var(--i-line)]")}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }

  return (
    // A tiny private icon from our own route: no optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(src)}
      className={cn(box, "bg-white object-contain ring-black/5 dark:ring-white/10")}
      style={{ width: size, height: size, padding: Math.max(2, Math.round(size * 0.12)) }}
    />
  );
}
