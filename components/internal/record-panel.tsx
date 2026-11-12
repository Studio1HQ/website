"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Plus, X } from "@phosphor-icons/react";
import { changeEntries } from "@/app/internal/(dashboard)/actions";
import {
  SECTIONS,
  statusLabel,
  type SectionKey,
} from "@/lib/internal/sections";
import type { Option } from "@/lib/internal/query";
import { cn } from "@/lib/utils";
import { TagPicker } from "@/components/internal/tag-picker";
import { useToast } from "@/components/internal/toast";
import {
  Card,
  Notice,
  StatusDot,
  TagChip,
  buttonClass,
  statusTone,
} from "@/components/internal/ui";

/** Status, tags and notes for one entry, saved as you go. */
export function RecordPanel({
  sectionKey,
  id,
  status,
  tags,
  notes,
  tagOptions,
  tagsReady,
  canEdit,
}: {
  canEdit: boolean;
  sectionKey: SectionKey;
  id: string;
  status: string;
  tags: string[];
  notes: string;
  tagOptions: Option[];
  tagsReady: boolean;
}) {
  const section = SECTIONS[sectionKey];
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentTags, setCurrentTags] = useState(tags);
  const [draft, setDraft] = useState(notes);
  const [savedNotes, setSavedNotes] = useState(notes);
  const [savingNotes, setSavingNotes] = useState(false);

  // A new entry (previous/next) or fresh server data resets local state;
  // unsaved notes survive refreshes caused by status or tag changes.
  const tagKey = tags.join("\u0000");
  useEffect(() => {
    setCurrentStatus(status);
    setCurrentTags(tagKey ? tagKey.split("\u0000") : []);
  }, [id, status, tagKey]);
  useEffect(() => {
    setDraft(notes);
    setSavedNotes(notes);
  }, [id, notes]);

  const setStatus = (next: string) => {
    if (next === currentStatus) return;
    const before = currentStatus;
    setCurrentStatus(next);
    startTransition(async () => {
      const result = await changeEntries(section.key, [id], { status: next });
      if (result.ok) toast("success", `Moved to ${statusLabel(next)}`);
      else {
        setCurrentStatus(before);
        toast("error", result.message);
      }
    });
  };

  const toggleTag = (tag: string, add: boolean) => {
    const before = currentTags;
    setCurrentTags(
      add
        ? before.some((item) => item.toLowerCase() === tag.toLowerCase())
          ? before
          : [...before, tag]
        : before.filter((item) => item.toLowerCase() !== tag.toLowerCase()),
    );
    startTransition(async () => {
      const result = await changeEntries(
        section.key,
        [id],
        add ? { addTags: [tag] } : { removeTags: [tag] },
      );
      if (!result.ok) {
        setCurrentTags(before);
        toast("error", result.message);
      }
    });
  };

  const saveNotes = () => {
    setSavingNotes(true);
    startTransition(async () => {
      const result = await changeEntries(section.key, [id], { notes: draft });
      setSavingNotes(false);
      if (result.ok) {
        setSavedNotes(draft);
        toast("success", "Notes saved");
      } else toast("error", result.message);
    });
  };

  const dirty = draft.trim() !== savedNotes.trim();

  return (
    <>
      <Card>
        <div className="px-4 pb-4 pt-3.5">
          <h2 className="mb-2.5 text-[12px] font-medium text-[var(--i-muted)]">
            Status
          </h2>
          <div
            role="radiogroup"
            aria-label="Status"
            className="grid grid-cols-2 gap-1.5"
          >
            {(section.statuses ?? []).map((value) => {
              const on = value === currentStatus;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!canEdit}
                  onClick={() => setStatus(value)}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-lg px-2.5 text-left text-[12.5px] transition-colors",
                    on
                      ? cn(
                          "font-medium ring-1 ring-inset",
                          statusTone(value).badge,
                        )
                      : "text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)] hover:bg-[var(--i-hover)] disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  <StatusDot status={value} />
                  <span className="flex-1 truncate">{statusLabel(value)}</span>
                  {on ? <Check size={13} weight="bold" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-4 pb-4 pt-3.5">
          <h2 className="mb-2.5 text-[12px] font-medium text-[var(--i-muted)]">
            Tags
          </h2>
          {tagsReady ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {currentTags.map((tag) =>
                !canEdit ? (
                  <TagChip key={tag} tag={tag} />
                ) : (
                  <TagChip key={tag} tag={tag} className="pr-0.5">
                    <button
                      type="button"
                      onClick={() => toggleTag(tag, false)}
                      aria-label={`Remove tag ${tag}`}
                      className="flex size-4 items-center justify-center rounded opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </TagChip>
                ),
              )}
              {!canEdit ? (
                currentTags.length ? null : (
                  <span className="text-[12.5px] text-[var(--i-faint)]">
                    No tags
                  </span>
                )
              ) : (
                <TagPicker
                  options={tagOptions}
                  state={(tag) =>
                    currentTags.some(
                      (item) => item.toLowerCase() === tag.toLowerCase(),
                    )
                      ? "all"
                      : "none"
                  }
                  onToggle={toggleTag}
                >
                  <button
                    type="button"
                    className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-[var(--i-line-strong)] px-2 text-[12px] text-[var(--i-muted)] hover:border-[var(--i-faint)] hover:text-[var(--i-ink)]"
                  >
                    <Plus size={11} weight="bold" /> Add tag
                  </button>
                </TagPicker>
              )}
            </div>
          ) : (
            <Notice tone="warning">
              Tags switch on once the dashboard migration has run.
            </Notice>
          )}
        </div>
      </Card>

      <Card>
        <div className="px-4 pb-4 pt-3.5">
          <label
            htmlFor="review-notes"
            className="mb-2.5 block text-[12px] font-medium text-[var(--i-muted)]"
          >
            Notes for the team
          </label>
          <textarea
            id="review-notes"
            readOnly={!canEdit}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                (event.metaKey || event.ctrlKey) &&
                event.key === "Enter" &&
                dirty
              )
                saveNotes();
            }}
            rows={5}
            maxLength={5000}
            placeholder="Interview feedback, next steps…"
            className="block w-full resize-y rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)] px-3 py-2 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-[var(--i-faint)] focus:border-[var(--i-line-strong)] focus:bg-[var(--i-panel)]"
          />
          {canEdit ? (
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-[var(--i-faint)]">
                {dirty ? "⌘ Enter to save" : savedNotes ? "Saved" : ""}
              </span>
              <button
                type="button"
                onClick={saveNotes}
                disabled={!dirty || savingNotes}
                className={buttonClass("primary", "sm")}
              >
                {savingNotes ? "Saving…" : "Save notes"}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[11.5px] text-[var(--i-faint)]">
              View only. Ask an admin for reviewer access.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}

/** j / k (or ← / →) steps through the list this entry was opened from. */
export function RecordKeys({ prev, next }: { prev?: string; next?: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          "input, textarea, select, [contenteditable=true], [role=menu], [role=dialog]",
        )
      )
        return;
      if ((event.key === "k" || event.key === "ArrowLeft") && prev)
        router.push(prev);
      if ((event.key === "j" || event.key === "ArrowRight") && next)
        router.push(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);
  return null;
}
