import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GRAIN, PRINT } from "@/lib/paper";

/**
 * Paper page header for inner pages: the home hero's cream sheet with grain,
 * a soft warm glow from the top, and ink type. Drop-in for NightHeader.
 */
export function PaperPageHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative isolate overflow-hidden text-[#141414]", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-30 mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
        <div className="absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(249,115,22,0.10),transparent_70%)]" />
      </div>
      <div className="relative">{children}</div>
    </header>
  );
}

/** Small pill that sits above a page title, in the paper style. */
export function PaperEyebrow({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-[13px] font-medium text-[#141414] ring-1 ring-inset ring-[#141414]/10">
      {icon ? <span style={{ color: PRINT }}>{icon}</span> : null}
      {children}
    </p>
  );
}
