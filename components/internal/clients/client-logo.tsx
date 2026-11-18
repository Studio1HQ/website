"use client";

import { SiteLogo } from "@/components/internal/site-logo";

/**
 * A client's logo (its website's icon, from /clients/<slug>/logo),
 * or the first letter of its name when there's no website or no icon.
 */
export function ClientLogo({
  slug,
  name,
  website,
  size = 24,
  className,
}: {
  slug: string;
  name: string;
  website: string | null | undefined;
  size?: number;
  className?: string;
}) {
  return (
    <SiteLogo
      path={`/clients/${encodeURIComponent(slug)}/logo`}
      name={name}
      website={website}
      size={size}
      className={className}
    />
  );
}
