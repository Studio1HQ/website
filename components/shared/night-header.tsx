import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Dark page header used across inner pages: a warm orange-red bloom from the
 * top edge with two soft light highlights, darker red toward the sides, and a
 * clean fade to black (into the page body in dark mode, so there is no seam).
 */
export function NightHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("s1-night relative isolate overflow-hidden bg-[#0a0605] text-white", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* One calm key light: ember at the top falling off to black */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#9a3412_0%,#6b2210_26%,#2b0e07_56%,#0a0605_82%)]" />
        {/* Two soft light sources drifting slowly in opposite directions */}
        <div className="s1-night-drift-a absolute -inset-x-[20%] inset-y-0 bg-[radial-gradient(ellipse_38%_48%_at_50%_0%,rgba(251,146,60,0.5),transparent_72%)]" />
        <div className="s1-night-drift-b absolute -inset-x-[20%] inset-y-0 bg-[radial-gradient(ellipse_30%_40%_at_50%_4%,rgba(255,190,140,0.3),transparent_70%)]" />
        {/* Edge falloff keeps the eye in the middle */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_90%_at_50%_10%,transparent_45%,rgba(10,6,5,0.7)_100%)]" />
        {/* Hairline at the top edge, like light catching glass */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(253,186,116,0.35)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-b from-transparent to-[var(--home-cream)] dark:block" />
      </div>
      <div className="relative">{children}</div>
    </header>
  );
}

/** Small glass pill that sits above a page title. */
export function NightEyebrow({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-4 py-1.5 text-[13px] font-medium text-white/90 backdrop-blur-md">
      {icon}
      {children}
    </p>
  );
}
