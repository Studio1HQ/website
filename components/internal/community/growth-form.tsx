"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "@phosphor-icons/react";
import { logGrowth } from "@/app/internal/(dashboard)/community/actions";
import {
  CHANNELS,
  channelLabel,
  todayKey,
} from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { buttonClass, inputClass } from "@/components/internal/ui";

const STARTERS = [
  "discord",
  "twitter",
  "linkedin",
  "youtube",
  "whatsapp",
  "instagram",
];

/**
 * "Log numbers": today's member or follower count per channel, typed in
 * once a week or so. A channel's number for a date replaces the old one.
 */
export function GrowthForm({
  channels,
  latest,
}: {
  channels: string[];
  latest: Record<string, number>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(todayKey());
  const tracked = channels.length ? channels : STARTERS;
  const [rows, setRows] = useState<{ channel: string; value: string }[]>(
    tracked.map((channel) => ({ channel, value: "" })),
  );
  const [busy, startTransition] = useTransition();

  const reset = () => {
    setDay(todayKey());
    setRows(tracked.map((channel) => ({ channel, value: "" })));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await logGrowth(
        day,
        rows.filter((row) => row.channel.trim() && row.value.trim()),
      );
      if (result.ok) {
        toast("success", result.message ?? "Saved");
        setOpen(false);
        router.refresh();
      } else toast("error", result.message);
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className={buttonClass("accent")}>
          <Plus size={14} /> Log numbers
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(480px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
              <div>
                <Dialog.Title className="text-[15px] font-medium">
                  Log community numbers
                </Dialog.Title>
                <Dialog.Description className="text-[12.5px] text-[var(--i-muted)]">
                  Members or followers per channel. Leave a channel blank to
                  skip it.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)]"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <div className="space-y-2.5 overflow-y-auto px-5 py-4">
              <label className="block text-[12px] text-[var(--i-muted)]">
                Date
                <input
                  type="date"
                  value={day}
                  max={todayKey()}
                  onChange={(event) => setDay(event.target.value)}
                  className={cn(inputClass(), "mt-1 w-[10rem]")}
                  required
                />
              </label>
              {rows.map((row, index) => {
                const known =
                  tracked.includes(row.channel) && index < tracked.length;
                return (
                  <div key={index} className="flex items-center gap-2">
                    {known ? (
                      <span className="w-40 shrink-0 truncate text-[13px]">
                        {channelLabel(row.channel)}
                      </span>
                    ) : (
                      <>
                        <input
                          value={row.channel}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((item, at) =>
                                at === index
                                  ? { ...item, channel: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Channel"
                          aria-label="Channel name"
                          list="growth-channels"
                          className={cn(inputClass(), "w-40 shrink-0")}
                        />
                      </>
                    )}
                    <input
                      inputMode="numeric"
                      value={row.value}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, at) =>
                            at === index
                              ? { ...item, value: event.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder={
                        latest[row.channel] !== undefined
                          ? `Last: ${latest[row.channel].toLocaleString("en-IN")}`
                          : "Members"
                      }
                      aria-label={`Number for ${channelLabel(row.channel) || "this channel"}`}
                      className={cn(inputClass(), "tabular-nums")}
                    />
                  </div>
                );
              })}
              <datalist id="growth-channels">
                {Object.values(CHANNELS).map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() =>
                  setRows((current) => [...current, { channel: "", value: "" }])
                }
                className="text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
              >
                + Another channel
              </button>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
              <Dialog.Close asChild>
                <button type="button" className={buttonClass("ghost")}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={busy || !rows.some((row) => row.value.trim())}
                className={buttonClass("accent")}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
