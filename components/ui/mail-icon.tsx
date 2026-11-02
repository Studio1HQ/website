import { cn } from "@/lib/utils";

/**
 * Envelope whose flap opens and letter rises when its parent `.group` is
 * hovered, plus an occasional idle nudge. Styles live in globals.css
 * (`.s1-mail`).
 */
export function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("s1-mail size-[18px] overflow-visible", className)}
    >
      {/* letter: hidden inside, rises out on hover */}
      <g className="s1-mail-letter">
        <rect x="6.5" y="7.5" width="11" height="8.5" rx="1.1" fill="currentColor" fillOpacity="0.2" />
        <path d="M9 10.4h6M9 12.8h4" />
      </g>
      {/* envelope body */}
      <rect x="3.5" y="6.5" width="17" height="12.5" rx="1.8" />
      {/* flap, hinged on the top edge; flips up on hover */}
      <path className="s1-mail-flap" d="M3.8 7 12 12.8 20.2 7" />
    </svg>
  );
}
