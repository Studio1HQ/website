import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A social icon link. At rest it is a plain ink icon; on hover or focus it
 * lifts onto a glassy white bubble, turns print orange and shows its name in
 * a small ink label above. Without an href it shows as a quiet placeholder.
 */
export function SocialBubble({
  href,
  label,
  name,
  children,
  size = "md",
}: {
  href?: string;
  /** What the link is, e.g. "LinkedIn". Shown in the label. */
  label: string;
  /** Who it belongs to, for screen readers, e.g. "Arindam Majumder". */
  name?: string;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "size-8" : "size-9";

  if (!href) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex items-center justify-center rounded-full text-[#141414]/20",
          box,
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name ? `${name} on ${label}` : label}
      className={cn(
        "group/social relative flex items-center justify-center rounded-full text-[#141414]/70 outline-none transition-all duration-300 ease-out",
        // Glass: a bright fill, a blur of what is behind, a light inner edge
        "hover:bg-white/85 hover:text-[#f97316] hover:shadow-[0_8px_20px_-10px_rgba(20,20,20,0.35),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_2px_rgba(20,20,20,0.06)] hover:backdrop-blur-md",
        "focus-visible:bg-white/85 focus-visible:text-[#f97316] focus-visible:ring-2 focus-visible:ring-[#f97316]/30",
        box,
      )}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-[#141414] px-2.5 py-1 text-[11px] font-medium leading-none tracking-[0.01em] text-white opacity-0 shadow-[0_8px_20px_-10px_rgba(20,20,20,0.6)] transition-all duration-200 ease-out group-hover/social:translate-y-0 group-hover/social:opacity-100 group-focus-visible/social:translate-y-0 group-focus-visible/social:opacity-100"
      >
        {label}
        <span className="absolute left-1/2 top-full -mt-[3px] size-1.5 -translate-x-1/2 rotate-45 rounded-[1px] bg-[#141414]" />
      </span>
    </a>
  );
}
