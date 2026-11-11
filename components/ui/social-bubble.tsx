import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A social icon link in the Team page's engraved round chip: ink with a white
 * icon on hover, and its name in a small ink label above. Without an href it
 * shows as a quiet placeholder.
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
          "flex items-center justify-center rounded-full bg-[#141414]/[0.04] text-[#141414]/25 shadow-[inset_0_1px_2px_rgba(20,20,20,0.12),inset_0_-1px_0_rgba(255,255,255,0.85)] ring-1 ring-inset ring-[#141414]/[0.06]",
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
        // The Team page chip: a soft engraved circle, ink with a white icon on hover
        "group/social relative flex items-center justify-center rounded-full bg-[#141414]/[0.04] text-[#141414]/60 shadow-[inset_0_1px_2px_rgba(20,20,20,0.12),inset_0_-1px_0_rgba(255,255,255,0.85)] ring-1 ring-inset ring-[#141414]/[0.06] outline-none transition-colors duration-200 hover:bg-[#141414] hover:text-white focus-visible:bg-[#141414] focus-visible:text-white",
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
