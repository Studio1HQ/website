"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowsClockwise } from "@/components/internal/icons";
import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { refreshData } from "@/app/internal/(dashboard)/actions";
import { cn } from "@/lib/utils";

/** Links that answer with a file or leave the dashboard shell: no page change to wait for. */
const NOT_A_PAGE = /^\/api\/|\/(export|pdf|resume|team-file|blog-media|blog-cover)(\/|$)/;

/**
 * A thin bar across the top from the moment a dashboard link is clicked
 * until its page shows, so a tab or sidebar click answers at once even when
 * the page's data takes a moment. It listens for clicks on any link on the
 * dashboard host, so every tab strip gets it without changes of its own.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = `${pathname}?${search}`;
  // The page the click happened on; the bar shows until we've left it.
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || NOT_A_PAGE.test(url.pathname)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setFrom(`${window.location.pathname}?${window.location.search.replace(/^\?/, "")}`);
      clearTimeout(timer);
      // Never left hanging: a link that turned out not to change the page.
      timer = setTimeout(() => setFrom(null), 12_000);
    };
    // Capture phase: Next's own link handler stops the default afterwards.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
    };
  }, []);

  const busy = from !== null && from === here;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] overflow-hidden transition-opacity print:hidden",
        // A short wait before it shows, so a page that's already kept doesn't flash it.
        busy ? "opacity-100 delay-100 duration-150" : "opacity-0 duration-200",
      )}
    >
      <div className={cn("h-full w-2/5 rounded-full bg-[var(--i-accent)]", busy && "internal-nav-progress")} />
    </div>
  );
}

/**
 * Put inside a <Link>: a small spinner while that link's page is loading,
 * so the clicked tab itself shows it's on its way.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-[var(--i-accent)] motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/**
 * Pages are kept in the browser for a few minutes (staleTimes in
 * next.config.ts), so this is how to get the latest without reloading: it
 * drops every kept page and loads this one again.
 */
export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Refresh"
      title="Get the latest data"
      disabled={pending}
      onClick={() =>
        start(async () => {
          // The server's own short-lived reads go first, then the page.
          // The answer already carries the fresh page; only reload it
          // separately when that request itself failed.
          await refreshData().catch(() => router.refresh());
        })
      }
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-black/[0.04] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.06]",
        className,
      )}
    >
      <ArrowsClockwise size={16} className={pending ? "animate-spin motion-reduce:animate-none" : undefined} />
    </button>
  );
}

/**
 * A link that fetches its whole page as soon as the pointer (or keyboard
 * focus) reaches it, so the click that follows shows the page at once. For
 * tabs and the sidebar; list rows keep the plain <Link>, or a sweep of the
 * mouse down a list would load every entry.
 */
export function HoverLink({ onMouseEnter, onFocus, ...props }: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [near, setNear] = useState(false);
  return (
    <Link
      {...props}
      prefetch={near ? true : null}
      onMouseEnter={(event) => {
        setNear(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setNear(true);
        onFocus?.(event);
      }}
    />
  );
}
