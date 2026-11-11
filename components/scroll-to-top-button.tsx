"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const SHOW_AFTER_PX = 520;
const SERVICE_PAGE_PATHS = [
  "/technical-content-marketing",
  "/developer-documentation-dx-audit",
  "/developer-video-production",
  "/developer-relations-growth-campaigns",
] as const;

export default function ScrollToTopButton() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  const hasServiceBottomNav = SERVICE_PAGE_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  useEffect(() => {
    const syncVisibility = () => {
      setIsVisible(window.scrollY > SHOW_AFTER_PX);
    };

    syncVisibility();
    window.addEventListener("scroll", syncVisibility, { passive: true });
    window.addEventListener("resize", syncVisibility);

    return () => {
      window.removeEventListener("scroll", syncVisibility);
      window.removeEventListener("resize", syncVisibility);
    };
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={scrollToTop}
      className={cn(
        "fixed right-4 z-[540] inline-flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/85 text-foreground shadow-[0_16px_44px_-22px_rgba(0,0,0,0.65)] transition-all duration-300 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:right-6",
        hasServiceBottomNav ? "bottom-36 md:bottom-32" : "bottom-5 md:bottom-6",
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" weight="bold" />
    </button>
  );
}
