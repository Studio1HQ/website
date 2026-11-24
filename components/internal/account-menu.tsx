"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as L from "lucide-react";
import { refreshData } from "@/app/internal/(dashboard)/actions";
import { Avatar } from "@/components/internal/ui";
import { SIDEBAR_EASE, SIDEBAR_FADE } from "@/lib/internal/sidebar";
import { cn } from "@/lib/utils";

const item =
  "flex h-9 cursor-pointer select-none items-center gap-3 rounded-md px-2.5 text-[13.5px] text-[var(--i-ink)] outline-none data-[highlighted]:bg-black/[0.05] dark:data-[highlighted]:bg-white/[0.07]";
const glyph = "size-[17px] shrink-0 text-[var(--i-muted)]";

function Row({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Menu.Item asChild>
      <Link href={href} className={item}>
        {icon}
        <span className="flex-1">{children}</span>
      </Link>
    </Menu.Item>
  );
}

/** A key hint on the right of a row. */
function Keys({ children }: { children: ReactNode }) {
  return <kbd className="font-sans text-[11.5px] text-[var(--i-faint)]">{children}</kbd>;
}

/**
 * The account at the foot of the sidebar: a button that opens a menu
 * upwards with who's signed in, their own pages, search, refresh and sign
 * out. Everything in it stays inside the dashboard.
 * Folded, only the avatar shows.
 */
export function AccountMenu({
  name,
  email,
  detail,
  photo,
  home,
  me,
  signOut,
}: {
  name: string;
  email: string;
  /** Role line under the name ("Admin · Owner", "Local preview"). */
  detail: string;
  photo?: string | null;
  /** This person's start page (the overview, or their one area). */
  home: string;
  /** Has a "My day" page. */
  me: boolean;
  signOut: () => Promise<void>;
}) {
  const router = useRouter();
  const [refreshing, start] = useTransition();
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "group/acct -mx-1 flex w-[calc(100%+8px)] min-w-0 items-center gap-2.5 overflow-hidden rounded-lg px-1.5 py-1.5 text-left outline-none transition-[background-color] hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--i-ring)] data-[state=open]:bg-black/[0.05] dark:hover:bg-white/[0.06] dark:data-[state=open]:bg-white/[0.07]",
          SIDEBAR_EASE,
        )}
        title={`${name} · ${email}`}
      >
        <Avatar name={name} email={email} size={28} src={photo} />
        {/* Just the name, on one line like "Studio1" at the top; the role is
            in the menu's header. */}
        <span className={cn("min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.01em]", SIDEBAR_FADE)}>
          {name}
        </span>
        <L.ChevronsUpDown strokeWidth={2} className={cn("size-4 shrink-0 text-[var(--i-faint)]", SIDEBAR_FADE)} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          side="top"
          align="start"
          sideOffset={8}
          className="internal-pop z-50 w-[248px] rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] p-1.5 shadow-[var(--i-shadow-pop)] data-[state=open]:animate-[internal-fade-in_140ms_ease-out]"
        >
          <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-2">
            <Avatar name={name} email={email} size={32} src={photo} />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium">{email}</p>
              <p className="truncate text-[12px] text-[var(--i-muted)]">{detail}</p>
            </div>
          </div>
          <Menu.Separator className="-mx-1.5 my-1 h-px bg-[var(--i-line)]" />
          <Row href={home} icon={<L.LayoutDashboard strokeWidth={2} className={glyph} />}>
            Overview
          </Row>
          {me ? (
            <Row href="/me" icon={<L.Sun strokeWidth={2} className={glyph} />}>
              My day
            </Row>
          ) : null}
          <Row href="/profile" icon={<L.UserRound strokeWidth={2} className={glyph} />}>
            Your profile
          </Row>
          <Row href="/connections" icon={<L.Plug strokeWidth={2} className={glyph} />}>
            Connections
          </Row>
          <Menu.Separator className="-mx-1.5 my-1 h-px bg-[var(--i-line)]" />
          <Menu.Item className={item} onSelect={() => window.dispatchEvent(new Event("internal:search"))}>
            <L.Search strokeWidth={2} className={glyph} />
            <span className="flex-1">Search pages</span>
            <Keys>Ctrl K</Keys>
          </Menu.Item>
          <Menu.Item className={item} onSelect={() => window.dispatchEvent(new Event("internal:customise-sidebar"))}>
            <L.SlidersHorizontal strokeWidth={2} className={glyph} />
            <span className="flex-1">Customise sidebar</span>
          </Menu.Item>
          <Menu.Item
            className={item}
            onSelect={(event) => {
              event.preventDefault();
              start(async () => {
                // The answer already carries the fresh page; only reload it
                // separately when that request itself failed.
                await refreshData().catch(() => router.refresh());
              });
            }}
          >
            <L.RefreshCw strokeWidth={2} className={cn(glyph, refreshing && "animate-spin motion-reduce:animate-none")} />
            <span className="flex-1">{refreshing ? "Refreshing…" : "Refresh data"}</span>
          </Menu.Item>
          <Menu.Separator className="-mx-1.5 my-1 h-px bg-[var(--i-line)]" />
          <Menu.Item className={item} onSelect={() => start(() => signOut())}>
            <L.LogOut strokeWidth={2} className={glyph} />
            <span className="flex-1">Log out</span>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
