"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as L from "lucide-react";
import { refreshData, signOut } from "@/app/internal/(dashboard)/actions";
import { useSidebarToggle } from "@/components/internal/mobile-nav";
import { cn } from "@/lib/utils";

type Kind = "pages" | "settings" | "actions";

type Entry = {
  key: string;
  kind: Kind;
  label: string;
  /** The section a sub-page belongs to ("Clients" for "This week"). */
  section: string | null;
  /** The sidebar's own icon for the page, copied as markup. */
  svg?: string;
  icon?: ReactNode;
  href?: string;
  run?: () => void;
};

const TABS: { id: "all" | Kind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pages", label: "Pages" },
  { id: "settings", label: "Settings" },
  { id: "actions", label: "Actions" },
];

const HEADINGS: Record<Kind, string> = { pages: "Pages", settings: "Settings", actions: "Actions" };

const clean = (tip: string | null | undefined) => (tip ?? "").split(" · ")[0].trim();

/**
 * Every page this person's sidebar links to, read from the sidebar itself so
 * the search never offers a page they can't open, each with the sidebar's
 * own icon. Links in the sidebar's Settings group count as settings.
 */
function readPages(): Entry[] {
  const seen = new Set<string>();
  const entries: Entry[] = [];
  document.querySelectorAll<HTMLAnchorElement>("#internal-sidebar nav a[href][data-tip]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || seen.has(href)) return;
    seen.add(href);
    const sub = link.closest("[data-subnav]");
    const parent = sub?.previousElementSibling as HTMLElement | null;
    const group = link.closest<HTMLElement>("[data-group]")?.dataset.group;
    entries.push({
      key: href,
      kind: group === "Settings" ? "settings" : "pages",
      label: clean(link.dataset.tip),
      section: sub ? clean(parent?.dataset.tip) || null : null,
      svg: link.querySelector("svg")?.outerHTML,
      href,
    });
  });
  if (!seen.has("/profile")) {
    entries.push({
      key: "/profile",
      kind: "settings",
      label: "Your profile",
      section: null,
      icon: <L.UserRound strokeWidth={2} />,
      href: "/profile",
    });
  }
  return entries;
}

/**
 * The dashboard's search (⌘K / Ctrl+K, or the button in the sidebar's
 * header): every page, setting and action in one list, with tabs to narrow
 * it. Type to filter, arrows to move, Enter to go.
 */
export function CommandSearch({ className }: { className?: string }) {
  const router = useRouter();
  const toggleSidebar = useSidebarToggle();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | Kind>("all");
  const [pages, setPages] = useState<Entry[]>([]);
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  /** Opening reads the sidebar afresh and starts from an empty search. */
  const toggle = useCallback((next: boolean) => {
    if (next) {
      setPages(readPages());
      setQuery("");
      setTab("all");
      setIndex(0);
    }
    setOpen(next);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle(!document.querySelector("[data-command-search]"));
      }
    }
    // The account menu's "Search" asks for it by event.
    const onAsk = () => toggle(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("internal:search", onAsk);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("internal:search", onAsk);
    };
  }, [toggle]);

  const actions = useMemo<Entry[]>(
    () => [
      {
        key: "refresh",
        kind: "actions",
        label: "Refresh data",
        section: null,
        icon: <L.RefreshCw strokeWidth={2} />,
        run: () =>
          start(async () => {
            await refreshData().catch(() => {});
            router.refresh();
          }),
      },
      {
        key: "fold",
        kind: "actions",
        label: "Fold or unfold the sidebar",
        section: null,
        icon: <L.PanelLeft strokeWidth={2} />,
        run: toggleSidebar,
      },
      {
        key: "out",
        kind: "actions",
        label: "Log out",
        section: null,
        icon: <L.LogOut strokeWidth={2} />,
        run: () => start(() => signOut()),
      },
    ],
    [router, toggleSidebar],
  );

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    // Grouped Pages → Settings → Actions, so arrow keys follow what's on screen.
    return (["pages", "settings", "actions"] as Kind[]).flatMap((kind) =>
      [...pages, ...actions].filter((entry) => {
        if (entry.kind !== kind || (tab !== "all" && tab !== kind)) return false;
        const text = `${entry.section ?? ""} ${entry.label}`.toLowerCase();
        return words.every((word) => text.includes(word));
      }),
    );
  }, [pages, actions, query, tab]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function choose(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    if (entry.href) router.push(entry.href);
    else entry.run?.();
  }

  return (
    <Dialog.Root open={open} onOpenChange={toggle}>
      <Dialog.Trigger
        aria-label="Search"
        title="Search (Ctrl K)"
        className={cn(
          "flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] transition-colors hover:bg-black/[0.05] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.07]",
          className,
        )}
      >
        <L.Search strokeWidth={2} className="size-[17px]" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="internal-pop fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-[internal-fade-in_140ms_ease-out]" />
        <Dialog.Content
          data-command-search
          aria-describedby={undefined}
          className="internal-pop fixed left-1/2 top-[12vh] z-50 flex max-h-[min(560px,76vh)] w-[min(620px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-pop)] data-[state=open]:animate-[internal-fade-in_140ms_ease-out]"
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-3 px-5 pt-4">
            <L.Search strokeWidth={2} className="size-[18px] shrink-0 text-[var(--i-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setIndex((i) => Math.min(i + 1, results.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setIndex((i) => Math.max(i - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  choose(results[index]);
                }
              }}
              placeholder="Search pages, settings and actions"
              aria-label="Search"
              className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-[var(--i-ink)] outline-none placeholder:text-[var(--i-faint)]"
            />
          </div>

          <div role="tablist" aria-label="Show" className="flex gap-1 px-4 pb-2 pt-3">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => {
                  setTab(item.id);
                  setIndex(0);
                }}
                className={cn(
                  "h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                  tab === item.id
                    ? "bg-black/[0.07] text-[var(--i-ink)] dark:bg-white/[0.1]"
                    : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            ref={list}
            role="listbox"
            aria-label="Results"
            className="internal-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2"
          >
            {results.length === 0 ? (
              <p className="px-3 py-10 text-center text-[13px] text-[var(--i-muted)]">Nothing matches “{query}”.</p>
            ) : (
              results.map((entry, i) => {
                const on = i === index;
                const heading = i === 0 || results[i - 1].kind !== entry.kind;
                return (
                  <div key={entry.key}>
                    {heading ? (
                      <p className="px-3 pb-1 pt-3 text-[12px] font-medium text-[var(--i-faint)]">
                        {HEADINGS[entry.kind]}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      data-index={i}
                      onMouseMove={() => setIndex(i)}
                      onClick={() => choose(entry)}
                      className={cn(
                        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] text-[var(--i-ink)]",
                        on ? "bg-black/[0.05] dark:bg-white/[0.07]" : null,
                      )}
                    >
                      {entry.svg ? (
                        <span
                          aria-hidden
                          className="flex size-[18px] shrink-0 items-center justify-center text-[var(--i-muted)] [&_svg]:size-[18px] [&_svg]:!text-current"
                          dangerouslySetInnerHTML={{ __html: entry.svg }}
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex size-[18px] shrink-0 items-center justify-center text-[var(--i-muted)] [&_svg]:size-[18px]"
                        >
                          {entry.icon}
                        </span>
                      )}
                      <span className="min-w-0 truncate">{entry.label}</span>
                      {entry.section ? (
                        <span className="shrink-0 text-[12.5px] text-[var(--i-faint)]">in {entry.section}</span>
                      ) : null}
                      {on ? (
                        <L.CornerDownLeft strokeWidth={2} className="ml-auto size-3.5 shrink-0 text-[var(--i-faint)]" />
                      ) : null}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
