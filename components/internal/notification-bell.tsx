"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import * as L from "lucide-react";
import { readAllNotifications, readNotification } from "@/app/internal/(dashboard)/notification-actions";
import { badgeText, type NoticeKind, type Notification } from "@/lib/internal/notifications/shared";
import { cn } from "@/lib/utils";
import { menuContentClass, relativeDate } from "@/components/internal/ui";

/**
 * The bell: your latest notifications in a popover, unread ones marked with
 * a dot and counted on the button. Opening one marks it read and goes to
 * its page; "Mark all read" clears the count. Everything stays inside the
 * dashboard.
 */

/** One icon per kind of notice, saying what it's about. */
const ICONS: Record<NoticeKind, L.LucideIcon> = {
  task: L.SquareCheckBig,
  call: L.Phone,
  deliverable: L.FileCheck2,
  claim: L.ReceiptText,
  access: L.UserRoundPlus,
  other: L.Bell,
};

export function NotificationBell({
  items,
  unread,
  side = "bottom",
  className,
}: {
  items: Notification[];
  unread: number;
  /** Where the list opens: below the bell (the default), or to its right. */
  side?: "bottom" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  // Shown as read straight away; the server catches up behind.
  const [seen, markSeen] = useOptimistic<{ all: boolean; ids: string[] }, string | "all">(
    { all: false, ids: [] },
    (state, id) => (id === "all" ? { all: true, ids: state.ids } : { all: state.all, ids: [...state.ids, id] }),
  );
  const isRead = (item: Notification) => Boolean(item.read_at) || seen.all || seen.ids.includes(item.id);
  const listedUnread = items.filter((item) => !item.read_at).length;
  const nowRead = items.filter((item) => !item.read_at && isRead(item)).length;
  // Unread ones older than the list still count until "Mark all read".
  const count = seen.all ? 0 : Math.max(0, unread - nowRead);

  const openOne = (item: Notification) => {
    setOpen(false);
    if (isRead(item)) return;
    start(async () => {
      markSeen(item.id);
      // A missed "read" isn't worth an error page: it's unread again next time.
      await readNotification(item.id).catch(() => {});
    });
  };

  const readAll = () =>
    start(async () => {
      markSeen("all");
      await readAllNotifications().catch(() => {});
    });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
          className={cn(
            "relative flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
            className,
          )}
        >
          <L.Bell strokeWidth={2} className="size-[18px]" />
          {/* Unread: one small still orange dot (the number is in the label and the list). */}
          {count ? (
            <span
              aria-hidden
              title={`${badgeText(count)} unread`}
              className="absolute right-[7px] top-[7px] size-2 rounded-full bg-[var(--i-accent)] ring-2 ring-[var(--i-panel)]"
            />
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={side === "right" ? "start" : "end"}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            menuContentClass,
            "flex max-h-[min(32rem,80dvh)] w-[min(24rem,calc(100vw-1.5rem))] flex-col rounded-2xl p-0",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3.5">
            <p className="text-[14.5px] font-medium">Notifications</p>
            {count || listedUnread > nowRead ? (
              <button
                type="button"
                onClick={readAll}
                className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium text-[var(--i-muted)] hover:bg-black/[0.05] hover:text-[var(--i-ink)] dark:hover:bg-white/[0.07]"
              >
                <L.CheckCheck strokeWidth={2} className="size-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length ? (
            <ul className="internal-scroll min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
              {items.map((item) => {
                const IconComponent = ICONS[item.kind];
                const read = isRead(item);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => openOne(item)}
                      className="flex gap-3 rounded-xl px-2.5 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] dark:bg-white/[0.07]",
                          read ? "text-[var(--i-faint)]" : "text-[var(--i-ink)]",
                        )}
                      >
                        <IconComponent strokeWidth={2} className="size-[17px]" />
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className={cn("block text-[13.5px] leading-snug", read ? "text-[var(--i-ink-2)]" : "font-medium")}>
                          {item.title}
                        </span>
                        {item.body ? (
                          <span className="mt-0.5 block truncate text-[12.5px] text-[var(--i-muted)]">{item.body}</span>
                        ) : null}
                        <span className="mt-0.5 block text-[11.5px] text-[var(--i-faint)]">{relativeDate(item.created_at)}</span>
                      </span>
                      {read ? null : <span aria-hidden className="mt-3 size-2 shrink-0 rounded-full bg-[var(--i-accent)]" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 pb-8 pt-6 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-black/[0.05] text-[var(--i-muted)] dark:bg-white/[0.07]">
                <L.BellOff strokeWidth={2} className="size-5" />
              </span>
              <p className="text-[13px] leading-relaxed text-[var(--i-muted)]">
                Nothing yet. When someone gives you a task, a review or a call, it shows here.
              </p>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
