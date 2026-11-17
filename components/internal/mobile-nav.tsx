"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { CaretLeft, List, X } from "@phosphor-icons/react";
import { SIDEBAR_COOKIE, SIDEBAR_EASE } from "@/lib/internal/sidebar";
import { cn } from "@/lib/utils";

/*
 * On phones the sidebar is a drawer: a top bar with a menu button opens it
 * from the left. From md up it's the usual sticky sidebar, which folds down
 * to its icons (the button on its edge, or Cmd/Ctrl+\) to give the page more
 * room. One sidebar serves all of it, so its links and counts are rendered once.
 *
 * Folded, the aside carries data-collapsed="true" and its parts hide their
 * text with md:group-data-[collapsed=true]/sidebar:… classes, so the server-
 * rendered bits (logo, profile) fold without needing this context.
 */

type DrawerState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Desktop only: folded down to the icons. */
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const DrawerContext = createContext<DrawerState>({
  open: false,
  setOpen: () => {},
  collapsed: false,
  toggleCollapsed: () => {},
});

const MOBILE = "(max-width: 767.98px)";

export function MobileNavProvider({
  children,
  collapsed: collapsedAtFirst = false,
}: {
  children: ReactNode;
  /** From the cookie, so the first paint already has the right width. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(collapsedAtFirst);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((was) => {
      const next = !was;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/internal; max-age=31536000; samesite=lax${
        location.protocol === "https:" ? "; secure" : ""
      }`;
      return next;
    });
  }, []);

  // Cmd+\ (Ctrl+\ elsewhere) folds and unfolds it, like Notion.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "\\" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (window.matchMedia(MOBILE).matches) return;
      event.preventDefault();
      toggleCollapsed();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);
  // The page the drawer was opened on: going to another page (a link, the
  // back button) closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  // Forget it once we've left, so coming back (forward button) doesn't reopen it.
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const open = openOn === pathname;
  const setOpen = useCallback((next: boolean) => setOpenOn(next ? pathname : null), [pathname]);

  // Turning the phone sideways (or widening the window) past md closes it.
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia(MOBILE);
    const onChange = () => {
      if (!query.matches) setOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [open, setOpen]);

  // The page behind stays put while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [open]);

  return (
    <DrawerContext.Provider value={{ open, setOpen, collapsed, toggleCollapsed }}>{children}</DrawerContext.Provider>
  );
}

/** Whether the desktop sidebar is folded down to its icons. */
export function useSidebarCollapsed() {
  return useContext(DrawerContext).collapsed;
}

const noSubscribe = () => () => {};

/** "⌘" on a Mac, "Ctrl+" elsewhere (the server guesses a Mac). */
function useModKey() {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+"),
    () => "⌘",
  );
}

// The width eases while the icons hold still and the text fades; the edge
// button rides the same curve.
const MOTION = SIDEBAR_EASE;

/**
 * The round button on the sidebar's right edge that folds and unfolds it
 * (desktop only). It sits outside the aside, which clips its text while it
 * narrows, so it's fixed to the page and follows the edge itself.
 */
function CollapseButton() {
  const { collapsed, toggleCollapsed } = useContext(DrawerContext);
  const mod = useModKey();
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={!collapsed}
      aria-controls="internal-sidebar"
      aria-keyshortcuts="Meta+Backslash Control+Backslash"
      title={`${label} (${mod}\\)`}
      onClick={toggleCollapsed}
      className={cn(
        "fixed top-[22px] z-30 hidden size-6 items-center justify-center rounded-full bg-[var(--i-panel)] text-[var(--i-muted)] shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)] transition-[left,color,transform] hover:scale-110 hover:text-[var(--i-ink)] active:scale-95 md:flex print:hidden",
        MOTION,
        // The sidebar's width less half the button.
        collapsed ? "left-12" : "left-56",
      )}
    >
      <CaretLeft
        size={12}
        weight="bold"
        className={cn("transition-transform", MOTION, collapsed && "rotate-180")}
      />
    </button>
  );
}

type Tip = { label: string; top: number; left: number };

/** The part of a folded sidebar under the pointer or keyboard that names itself with data-tip. */
function tipFor(target: EventTarget | null): Tip | null {
  const el = target instanceof Element ? target.closest<HTMLElement>("[data-tip]") : null;
  if (!el?.dataset.tip) return null;
  const rect = el.getBoundingClientRect();
  return { label: el.dataset.tip, top: rect.top + rect.height / 2, left: rect.right + 10 };
}

/** The hamburger in the phone top bar. */
export function MobileNavButton({ className }: { className?: string }) {
  const { open, setOpen } = useContext(DrawerContext);
  return (
    <button
      type="button"
      aria-label="Open menu"
      aria-expanded={open}
      aria-controls="internal-sidebar"
      data-drawer-opener=""
      onClick={() => setOpen(true)}
      className={cn(
        "flex size-10 items-center justify-center rounded-lg text-[var(--i-ink-2)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
        className,
      )}
    >
      <List size={20} />
    </button>
  );
}

/** Closes the drawer; only shown on phones. */
export function MobileNavClose() {
  const { setOpen } = useContext(DrawerContext);
  return (
    <button
      type="button"
      aria-label="Close menu"
      data-drawer-close=""
      onClick={() => setOpen(false)}
      className="-mr-1 flex size-10 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)] md:hidden"
    >
      <X size={18} />
    </button>
  );
}

/**
 * The sidebar itself. On phones it slides in over the page with a scrim;
 * while closed it's `invisible`, so its links leave the tab order and the
 * accessibility tree. From md up it's a plain sticky column.
 */
export function MobileNavPanel({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen, collapsed } = useContext(DrawerContext);
  const panel = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  // Folded, the links are icons only: their names show beside them on
  // hover or keyboard focus. Drawn outside the aside (its transform would
  // pin a fixed child to it) and only on desktop.
  const [tip, setTip] = useState<Tip | null>(null);
  const showTip = (target: EventTarget | null) =>
    setTip(collapsed && !window.matchMedia(MOBILE).matches ? tipFor(target) : null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      panel.current?.querySelector<HTMLElement>("[data-drawer-close]")?.focus();
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") close();
        if (event.key !== "Tab" || !panel.current) return;
        // Keep Tab inside the drawer while it covers the page.
        const items = [
          ...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])"),
        ].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      // Back to the menu button, unless a link moved focus to a new page.
      if (!document.activeElement || document.activeElement === document.body || panel.current?.contains(document.activeElement)) {
        document.querySelector<HTMLElement>("[data-drawer-opener]")?.focus({ preventScroll: true });
      }
    }
  }, [open, close]);

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] transition-opacity duration-200 md:hidden print:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id="internal-sidebar"
        ref={panel}
        aria-label="Sidebar"
        data-open={open}
        // A tap on a link to the page that's already open closes it too.
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a[href]")) close();
        }}
        onPointerOver={(event) => {
          if (event.pointerType === "mouse") showTip(event.target);
        }}
        onPointerLeave={() => setTip(null)}
        onFocus={(event) => {
          if (event.target.matches(":focus-visible")) showTip(event.target);
        }}
        onBlur={() => setTip(null)}
        onWheel={() => setTip(null)}
        {...(open ? { role: "dialog", "aria-modal": true } : {})}
        data-collapsed={collapsed}
        className={cn(
          "group/sidebar fixed inset-y-0 left-0 z-50 flex w-[min(300px,86vw)] flex-col bg-[var(--i-sidebar)] shadow-[var(--i-shadow-pop)] transition-[transform,visibility]",
          open ? "visible translate-x-0" : "invisible -translate-x-full",
          // Desktop: a sticky column whose width eases between full and
          // icons; overflow-hidden clips the text as it narrows. 60px puts
          // the icons (12px padding + 10px inset + 16px) dead centre.
          "md:visible md:sticky md:top-0 md:z-auto md:h-screen md:shrink-0 md:translate-x-0 md:overflow-hidden md:border-r md:border-[var(--i-line)] md:shadow-none md:transition-[width] md:motion-reduce:transition-none",
          MOTION,
          collapsed ? "md:w-[60px]" : "md:w-[236px]",
          "print:hidden",
          className,
        )}
      >
        {children}
      </aside>
      <CollapseButton />
      {collapsed && tip ? (
        <div
          aria-hidden
          style={{ top: tip.top, left: tip.left }}
          className="pointer-events-none fixed z-50 hidden -translate-y-1/2 animate-[internal-tip-in_140ms_ease-out] whitespace-nowrap rounded-md bg-[var(--i-ink)] px-2 py-1 text-[12px] font-medium text-[var(--i-panel)] shadow-[var(--i-shadow-pop)] md:block print:hidden"
        >
          {tip.label}
        </div>
      ) : null}
    </>
  );
}
