"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bell, CalendarBlank, CheckSquare, FileText, Receipt, UserPlus, type Icon } from "@phosphor-icons/react";
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

const ICONS: Record<NoticeKind, Icon> = {
  task: CheckSquare,
  call: CalendarBlank,
  deliverable: FileText,
  claim: Receipt,
  access: UserPlus,
  other: Bell,
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
      await readNotification(item.id);
    });
  };

  const readAll = () =>
    start(async () => {
      markSeen("all");
      await readAllNotifications();
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
          <Bell size={17} weight={count ? "fill" : "regular"} />
          {count ? (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--i-accent)] px-1 text-[10px] font-medium leading-none text-white">
              {badgeText(count)}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={side === "right" ? "start" : "end"}
          sideOffset={8}
          collisionPadding={12}
          className={cn(menuContentClass, "flex max-h-[min(30rem,80dvh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col p-0")}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--i-line)] px-3.5 py-2.5">
            <p className="text-[13px] font-medium">Notifications</p>
            {count || listedUnread > nowRead ? (
              <button type="button" onClick={readAll} className="text-[12px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length ? (
            <ul className="min-h-0 flex-1 divide-y divide-[var(--i-line)] overflow-y-auto">
              {items.map((item) => {
                const IconComponent = ICONS[item.kind];
                const read = isRead(item);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => openOne(item)}
                      className="flex gap-3 px-3.5 py-3 hover:bg-[var(--i-hover)]"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                          read
                            ? "bg-[var(--i-sunken)] text-[var(--i-faint)] ring-[var(--i-line)]"
                            : "bg-[var(--i-accent-soft)] text-[var(--i-accent-text)] ring-transparent",
                        )}
                      >
                        <IconComponent size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[13px] leading-snug", read ? "text-[var(--i-ink-2)]" : "font-medium")}>
                          {item.title}
                        </span>
                        {item.body ? (
                          <span className="mt-0.5 block truncate text-[12.5px] text-[var(--i-muted)]">{item.body}</span>
                        ) : null}
                        <span className="mt-0.5 block text-[11.5px] text-[var(--i-faint)]">{relativeDate(item.created_at)}</span>
                      </span>
                      {read ? null : <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-[var(--i-accent)]" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3.5 py-8 text-center text-[13px] text-[var(--i-muted)]">
              Nothing yet. When someone gives you a task, a review or a call, it shows here.
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
