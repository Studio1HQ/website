import type { ReactNode } from "react";
import Image from "next/image";
import {
  CalendarDots,
  DevToLogo,
  DiscordLogo,
  GithubLogo,
  LinkedinLogo,
  MediumLogo,
  RedditLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { cn } from "@/lib/utils";

/*
 * Small brand marks set inline beside the channel or platform a line
 * mentions ("X, LinkedIn, YouTube", "GitHub repo", "meetup"...).
 */

const BRANDS: { pattern: RegExp; icon: Icon; color: string }[] = [
  {
    pattern: /^(GitHub|open-source|Open-source|open source|Open source)$/,
    icon: GithubLogo,
    color: "currentColor",
  },
  { pattern: /^LinkedIn$/, icon: LinkedinLogo, color: "#0A66C2" },
  { pattern: /^Reddit$/, icon: RedditLogo, color: "#FF4500" },
  { pattern: /^YouTube$/, icon: YoutubeLogo, color: "#FF0000" },
  { pattern: /^X$/, icon: XLogo, color: "currentColor" },
  { pattern: /^Dev\.to$/, icon: DevToLogo, color: "currentColor" },
  { pattern: /^Medium$/, icon: MediumLogo, color: "currentColor" },
  { pattern: /^Discord$/, icon: DiscordLogo, color: "#5865F2" },
  {
    pattern:
      /^(events?|Events?|meetups?|Meetups?|workshops?|Workshops?|hackathons?|Hackathons?|conferences?|Conferences?)$/,
    icon: CalendarDots,
    color: "#ea580c",
  },
];

const SPLIT =
  /(\bGitHub\b|\b[Oo]pen[- ]source\b|\bLinkedIn\b|\bReddit\b|\bYouTube\b|(?<![\w.])X(?![\w.])|\bDev\.to\b|\bMedium\b|\bDiscord\b|\b[Ee]vents?\b|\b[Mm]eetups?\b|\b[Ww]orkshops?\b|\b[Hh]ackathons?\b|\b[Cc]onferences?\b)/;

export function BrandText({
  text,
  color,
}: {
  text: string;
  /** Draw every mark in this colour (e.g. white on an orange card). */
  color?: string;
}) {
  const parts = text.split(SPLIT);
  if (parts.length === 1) return <>{text}</>;
  // One span, so the parts stay a single line of text inside flex rows.
  return (
    <span>
      {parts.map((part, index) => {
        const brand = BRANDS.find((item) => item.pattern.test(part));
        if (!brand) return part;
        const Glyph = brand.icon;
        return (
          <span key={index} className="whitespace-nowrap">
            <Glyph
              aria-hidden
              weight="fill"
              className="mr-[0.25em] inline-block size-[1.05em] -translate-y-[0.08em] align-middle"
              style={{ color: color ?? brand.color }}
            />
            {part}
          </span>
        );
      })}
    </span>
  );
}

/** Client logo tile from a case-study link ("/case-studies/memori"). */
export function ClientMark({
  href,
  className,
}: {
  href: string;
  className?: string;
}): ReactNode {
  const logo = getClientLogo(href.split("/").filter(Boolean).pop() ?? "");
  if (!logo) return null;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#f8f6f2] p-1.5 shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)]",
        className,
      )}
    >
      <Image
        src={logo.icon}
        alt=""
        className="size-full rounded-[4px] object-contain mix-blend-multiply"
      />
    </span>
  );
}
