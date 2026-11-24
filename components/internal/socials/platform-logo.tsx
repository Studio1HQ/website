import type { SVGProps } from "react";
import {
  EnvelopeSimple,
  GithubLogo,
  Globe,
  InstagramLogo,
  ShareNetwork,
  UsersThree,
  XLogo,
  YoutubeLogo,
} from "@/components/internal/icons";
import type { Platform } from "@/lib/internal/socials/schema";
import { cn } from "@/lib/utils";

/**
 * A platform's logo in one colour on a quiet tile, in the dashboard's own
 * neutrals: ink on light grey in light mode, white on soft grey in dark.
 * No brand colours, so a row of them sits calmly with the rest of the page.
 * Decorative: the platform's name always sits next to it.
 * No hooks: safe in server and client components.
 */

/**
 * LinkedIn's "in" on its own. Phosphor's LinkedIn mark is the whole framed
 * square, which reads as a box in a box on a tile. Path from Simple Icons
 * (CC0), without the frame.
 */
function LinkedinIn({
  size,
  ...props
}: { size: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="2.5 2.5 19 19"
      width={size}
      height={size}
      fill="currentColor"
      {...props}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
    </svg>
  );
}

const TILE =
  "inline-flex shrink-0 items-center justify-center bg-[var(--i-hover)] text-[var(--i-ink)] ring-1 ring-inset ring-[var(--i-line)]";

/** The whole audience, as a tile that sits with the platform logos. */
export function AudienceLogo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(TILE, size >= 24 ? "rounded-lg" : "rounded-md", className)}
      style={{ width: size, height: size }}
    >
      <UsersThree size={Math.round(size * 0.6)} weight="fill" />
    </span>
  );
}

type Look = {
  icon: typeof XLogo | "linkedin";
  weight?: "fill" | "bold";
  /** The logo's size as a share of the tile. */
  scale?: number;
};

const LOOKS: Record<Platform, Look> = {
  linkedin: { icon: "linkedin", scale: 0.46 },
  x: { icon: XLogo, scale: 0.5 },
  youtube: { icon: YoutubeLogo, scale: 0.62 },
  instagram: { icon: InstagramLogo, weight: "bold", scale: 0.58 },
  github: { icon: GithubLogo, scale: 0.58 },
  newsletter: { icon: EnvelopeSimple, weight: "bold", scale: 0.54 },
  website: { icon: Globe, weight: "bold", scale: 0.54 },
  other: { icon: ShareNetwork, weight: "bold", scale: 0.54 },
};

export function PlatformLogo({
  platform,
  size = 28,
  className,
}: {
  platform: Platform;
  /** The tile's width and height in pixels. */
  size?: number;
  className?: string;
}) {
  const look = LOOKS[platform] ?? LOOKS.other;
  const glyph = Math.round(size * (look.scale ?? 0.56));
  const Icon = look.icon;
  return (
    <span
      aria-hidden
      className={cn(TILE, size >= 24 ? "rounded-lg" : "rounded-md", className)}
      style={{ width: size, height: size }}
    >
      {Icon === "linkedin" ? (
        <LinkedinIn size={glyph} />
      ) : (
        <Icon size={glyph} weight={look.weight ?? "fill"} />
      )}
    </span>
  );
}
