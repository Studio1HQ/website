"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ArrowLeft, CaretDown } from "@/components/internal/icons";
import { moveDeliverable as moveDeliverableAction } from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import { moveNeeds, nextStatuses } from "@/lib/internal/clients/rules";
import {
  DELIVERABLE_STATUSES,
  NO_SECRETS_HINT,
  OUR_PLATFORMS,
  WRITTEN_KINDS,
  publishedBy,
  statusLabel,
  todayKey,
  toneOf,
  type Deliverable,
  type DeliverableStatus,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { DateField } from "@/components/internal/pickers";
import {
  buttonClass,
  inputClass,
  menuContentClass,
  menuItemClass,
} from "@/components/internal/ui";
import { TONES } from "@/components/internal/community/ui";
import { StatusBadge } from "@/components/internal/clients/ui";

const moveDeliverable = guarded(moveDeliverableAction);

/**
 * A deliverable's status pill that opens the moves allowed from where it is
 * (rules.ts nextStatuses; internal engagements may skip Client review).
 * Published asks for the live link, Client review for the client's reply
 * date, inline, before saving. Without `canChange` it's just the pill.
 */
export function MoveStatusMenu({
  deliverable,
  internal = false,
  canChange,
  onMoved,
  align = "start",
}: {
  deliverable: Pick<
    Deliverable,
    "id" | "title" | "status" | "published_url" | "client_due_on"
  > &
    Partial<Pick<Deliverable, "kind">>;
  /** The engagement's type is "internal". */
  internal?: boolean;
  /** canChangeDeliverable for the viewer. */
  canChange: boolean;
  /** After a successful move (the page refreshes either way). */
  onMoved?: (to: DeliverableStatus) => void;
  align?: "start" | "end";
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<DeliverableStatus | null>(null);
  const [url, setUrl] = useState(deliverable.published_url ?? "");
  const [due, setDue] = useState(deliverable.client_due_on ?? "");
  // Published: the client put it on their site, or we did on Medium/dev.to.
  const startWho = publishedBy(deliverable.published_url)?.by ?? "client";
  const [who, setWho] = useState<"client" | "studio1">(startWho);
  // Written pieces ask who published them; anything else just its link.
  const written = Boolean(
    deliverable.kind && WRITTEN_KINDS.has(deliverable.kind),
  );
  const [liveOn, setLiveOn] = useState(todayKey());
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const options = nextStatuses(deliverable.status, { internal });
  const name = (status: DeliverableStatus) =>
    statusLabel(status, deliverable.kind);
  if (!canChange || options.length === 0)
    return <StatusBadge status={deliverable.status} kind={deliverable.kind} />;

  const reset = () => {
    setPicked(null);
    setError(null);
    setComment("");
    setUrl(deliverable.published_url ?? "");
    setDue(deliverable.client_due_on ?? "");
    setWho(startWho);
    setLiveOn(todayKey());
  };

  /** The live link has to match who published it (Medium/dev.to = us). */
  const publishProblem = () => {
    const found = publishedBy(url.trim());
    if (!found) return "Paste the full live link, starting with https://.";
    if (!written) return null;
    if (who === "studio1" && found.by !== "studio1")
      return "We publish on Medium or dev.to: paste that link, or pick “The client”.";
    if (who === "client" && found.by === "studio1")
      return `That's a ${found.where} link, so we published it: pick “We did”.`;
    return null;
  };

  const send = (to: DeliverableStatus) => {
    setError(null);
    const problem = to === "published" ? publishProblem() : null;
    if (problem) {
      setError(problem);
      return;
    }
    startTransition(async () => {
      const result = await moveDeliverable(deliverable.id, {
        to,
        published_url: to === "published" ? url : undefined,
        published_on: to === "published" ? liveOn : undefined,
        client_due_on: to === "client_review" ? due : undefined,
        comment,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Moved");
      setOpen(false);
      reset();
      onMoved?.(to);
      afterSave();
    });
  };

  const choose = (to: DeliverableStatus) => {
    const needs = moveNeeds(to);
    // Ask first when the move needs something: Published always asks who
    // published it and where, Client review the reply date (both pre-filled
    // when known).
    if (needs.publishedUrl || needs.clientDueOn) {
      setPicked(to);
      return;
    }
    send(to);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (picked) send(picked);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Opening as well as closing: the link and reply date start from
        // what's saved now, not from when this row was first shown.
        reset();
      }}
    >
      <Popover.Trigger
        aria-label={`Status of ${deliverable.title}: ${name(deliverable.status)}. Change it`}
        disabled={busy}
        className={cn(
          "group inline-flex items-center gap-0.5 rounded-full outline-none disabled:opacity-60",
          busy && "animate-pulse",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <StatusBadge status={deliverable.status} kind={deliverable.kind} />
        <CaretDown
          size={11}
          className="text-[var(--i-faint)] group-hover:text-[var(--i-muted)]"
          aria-hidden
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            menuContentClass,
            picked ? "w-[min(20rem,calc(100vw-1.5rem))] p-3" : "min-w-[12rem]",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {picked ? (
            <form onSubmit={submit} className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-1 self-start text-[12px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
              >
                <ArrowLeft size={12} /> Back
              </button>
              <p className="text-[13px] font-medium">Move to {name(picked)}</p>
              {picked === "published" ? (
                <>
                  {written ? (
                    <fieldset>
                      <legend className="mb-1 block text-[12px] text-[var(--i-muted)]">
                        Who published it?
                      </legend>
                      <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--i-sunken)] p-0.5">
                        {(
                          [
                            ["client", "The client"],
                            ["studio1", "We did"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={who === value}
                            onClick={() => {
                              setWho(value);
                              setError(null);
                            }}
                            className={cn(
                              "h-7 rounded-md text-[12.5px] font-medium transition-colors",
                              who === value
                                ? "bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-sm)]"
                                : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                  <label className="block">
                    <span className="mb-1 block text-[12px] text-[var(--i-muted)]">
                      {!written
                        ? "Live link"
                        : who === "client"
                          ? "Link on their site"
                          : `Link on ${OUR_PLATFORMS.map((platform) => platform.name).join(" or ")}`}{" "}
                      <span className="text-[var(--i-accent-text)]">*</span>
                    </span>
                    <input
                      type="url"
                      inputMode="url"
                      required
                      autoFocus
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder={
                        !written
                          ? "https://"
                          : who === "client"
                            ? "https://their-site.com/blog/…"
                            : "https://dev.to/…"
                      }
                      className={inputClass()}
                    />
                    <span className="mt-1 block text-[11.5px] leading-snug text-[var(--i-faint)]">
                      {NO_SECRETS_HINT}
                    </span>
                  </label>
                  <div>
                    <span className="mb-1 block text-[12px] text-[var(--i-muted)]">
                      Went live on
                    </span>
                    <DateField
                      value={liveOn}
                      onChange={setLiveOn}
                      max={todayKey()}
                      required
                      aria-label="Went live on"
                    />
                  </div>
                </>
              ) : null}
              {picked === "client_review" ? (
                <div>
                  <span className="mb-1 block text-[12px] text-[var(--i-muted)]">
                    Client to reply by{" "}
                    <span className="text-[var(--i-accent-text)]">*</span>
                  </span>
                  <DateField
                    value={due}
                    onChange={setDue}
                    min={todayKey()}
                    required
                    aria-label="Client to reply by"
                  />
                  <span className="mt-1 block text-[11.5px] leading-snug text-[var(--i-faint)]">
                    After this date it shows as waiting on the client.
                  </span>
                </div>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-[12px] text-[var(--i-muted)]">
                  Comment (optional)
                </span>
                <input
                  type="text"
                  value={comment}
                  maxLength={500}
                  onChange={(event) => setComment(event.target.value)}
                  className={inputClass()}
                />
              </label>
              {error ? (
                <p
                  role="alert"
                  className="text-[12.5px] text-rose-700 dark:text-rose-300"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={
                  busy ||
                  (picked === "client_review" && !due) ||
                  (picked === "published" && !url.trim())
                }
                className={buttonClass("accent")}
              >
                {busy ? "Saving…" : `Move to ${name(picked)}`}
              </button>
            </form>
          ) : (
            <div role="menu" aria-label="Move to">
              <p className="px-2 pb-1 pt-1.5 text-[11.5px] text-[var(--i-faint)]">
                Move to
              </p>
              {options.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="menuitem"
                  onClick={() => choose(status)}
                  className={cn(
                    menuItemClass,
                    "w-full hover:bg-[var(--i-hover)]",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      TONES[toneOf(DELIVERABLE_STATUSES, status)].dot,
                    )}
                  />
                  <span className="flex-1 text-left">{name(status)}</span>
                </button>
              ))}
              {error ? (
                <p
                  role="alert"
                  className="px-2 pb-1.5 pt-1 text-[12px] text-rose-700 dark:text-rose-300"
                >
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
