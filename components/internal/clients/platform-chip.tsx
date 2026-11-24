import {
  Butterfly,
  DevToLogo,
  DiscordLogo,
  GithubLogo,
  Globe,
  LinkedinLogo,
  MediumLogo,
  Newspaper,
  RedditLogo,
  ThreadsLogo,
  XLogo,
  YoutubeLogo,
} from "@/components/internal/icons";
import { platformOf } from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";

/**
 * A live link as a chip in its platform's colors: LinkedIn blue, X black,
 * Reddit orange, daily.dev violet, YouTube red… with the platform's icon.
 * No hooks: safe in server and client components.
 */

type Look = { icon: typeof Globe; className: string };

const LOOKS: Record<string, Look> = {
  LinkedIn: {
    icon: LinkedinLogo,
    className:
      "bg-[#0A66C2]/10 text-[#0A66C2] ring-[#0A66C2]/20 dark:bg-[#0A66C2]/20 dark:text-[#70b5f9]",
  },
  X: {
    icon: XLogo,
    className:
      "bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100",
  },
  Reddit: {
    icon: RedditLogo,
    className:
      "bg-[#FF4500]/10 text-[#C83A00] ring-[#FF4500]/20 dark:text-[#ff8a5c]",
  },
  "daily.dev": {
    icon: Newspaper,
    className:
      "bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-500/30",
  },
  YouTube: {
    icon: YoutubeLogo,
    className:
      "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  },
  "dev.to": {
    icon: DevToLogo,
    className:
      "bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100",
  },
  Medium: {
    icon: MediumLogo,
    className:
      "bg-zinc-100 text-zinc-900 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700",
  },
  GitHub: {
    icon: GithubLogo,
    className:
      "bg-zinc-100 text-zinc-800 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700",
  },
  Discord: {
    icon: DiscordLogo,
    className:
      "bg-[#5865F2]/10 text-[#4752C4] ring-[#5865F2]/20 dark:text-[#a5acff]",
  },
  Bluesky: {
    icon: Butterfly,
    className:
      "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  },
  Threads: {
    icon: ThreadsLogo,
    className:
      "bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100",
  },
  "Hacker News": {
    icon: Newspaper,
    className:
      "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30",
  },
  "Product Hunt": {
    icon: Globe,
    className:
      "bg-[#DA552F]/10 text-[#B8461F] ring-[#DA552F]/20 dark:text-[#f08a66]",
  },
};

const PLAIN: Look = {
  icon: Globe,
  className: "bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-[var(--i-line)]",
};

export function PlatformChip({
  url,
  label,
  className,
}: {
  url: string;
  /** Defaults to the platform's name. */
  label?: string;
  className?: string;
}) {
  const name = platformOf(url) ?? "Link";
  const look = LOOKS[name] ?? PLAIN;
  const Icon = look.icon;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={url}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium ring-1 ring-inset transition-opacity hover:opacity-80",
        look.className,
        className,
      )}
    >
      <Icon size={12} weight="bold" aria-hidden className="shrink-0" />
      <span className="truncate">{label ?? name}</span>
    </a>
  );
}

/**
 * A post's links as chips, one per platform: eight LinkedIn links show as
 * "LinkedIn ×8" (linking to the first; every link is in the edit form).
 */
export function PlatformChips({ urls }: { urls: readonly string[] }) {
  const groups = new Map<string, string[]>();
  for (const url of urls) {
    const name = platformOf(url) ?? "Link";
    groups.set(name, [...(groups.get(name) ?? []), url]);
  }
  return (
    <>
      {[...groups.entries()].map(([name, list]) => (
        <PlatformChip
          key={name}
          url={list[0]}
          label={list.length > 1 ? `${name} ×${list.length}` : name}
        />
      ))}
    </>
  );
}
