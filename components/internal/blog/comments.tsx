"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import {
  ArrowBendUpLeft,
  ArrowCounterClockwise,
  CaretRight,
  ChatCircle,
  Check,
  CheckCircle,
  CircleNotch,
  X,
} from "@/components/internal/icons";
import { cleanQuote, locateQuote, nameFromEmail, type CommentThread } from "@/lib/internal/blog/shared";
import { cn } from "@/lib/utils";
import { Card, buttonClass, formatDate, relativeDate } from "@/components/internal/ui";
import { TeamAvatar } from "@/components/internal/team-photos";

/*
 * Comments on a post, Google Docs style: select text in the editor and press
 * Comment, and the thread keeps that text as its quote. Open threads' quotes
 * are highlighted in the editor with the CSS Custom Highlight API, which
 * paints over the text without touching the editor's DOM. Threads take
 * replies and can be resolved; a reply opens a resolved thread again.
 */

const HIGHLIGHT = "blog-comment";
const HIGHLIGHT_ACTIVE = "blog-comment-active";

function editorContent(container: HTMLElement | null) {
  return container?.querySelector<HTMLElement>(".blog-editor-content") ?? null;
}

/** The editor's text nodes, in order. */
function textNodes(root: HTMLElement) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  return nodes;
}

function rangeFor(root: HTMLElement, quote: string) {
  const nodes = textNodes(root);
  const found = locateQuote(
    nodes.map((node) => node.data),
    quote,
  );
  if (!found) return null;
  const range = document.createRange();
  range.setStart(nodes[found.start[0]], found.start[1]);
  range.setEnd(nodes[found.end[0]], found.end[1]);
  return range;
}

const highlightsSupported = () => typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

/**
 * Highlights open threads' quotes in the editor (the active one stronger)
 * and reports which quotes aren't in the text anymore. `version` changes
 * whenever the text does.
 */
export function useQuoteHighlights(
  containerRef: RefObject<HTMLElement | null>,
  threads: CommentThread[],
  activeId: string | null,
  version: number,
) {
  const [missing, setMissing] = useState<Set<string>>(new Set());
  // The editor loads after the page; look again until it's there.
  const [tries, setTries] = useState(0);

  useEffect(() => {
    // The editor re-renders its DOM after a change; paint once it has.
    const timer = setTimeout(() => {
      const root = editorContent(containerRef.current);
      if (!root) {
        if (tries < 40) setTries((count) => count + 1);
        return;
      }
      const all: Range[] = [];
      const active: Range[] = [];
      const gone = new Set<string>();
      for (const { root: comment } of threads) {
        if (!comment.quote || comment.resolved_at) continue;
        const range = rangeFor(root, comment.quote);
        if (!range) gone.add(comment.id);
        else (comment.id === activeId ? active : all).push(range);
      }
      setMissing((previous) =>
        previous.size === gone.size && [...gone].every((id) => previous.has(id)) ? previous : gone,
      );
      if (!highlightsSupported()) return;
      CSS.highlights.set(HIGHLIGHT, new Highlight(...all));
      CSS.highlights.set(HIGHLIGHT_ACTIVE, new Highlight(...active));
    }, 250);
    return () => clearTimeout(timer);
  }, [containerRef, threads, activeId, version, tries]);

  useEffect(
    () => () => {
      if (!highlightsSupported()) return;
      CSS.highlights.delete(HIGHLIGHT);
      CSS.highlights.delete(HIGHLIGHT_ACTIVE);
    },
    [],
  );

  /** Scrolls the editor to a quote. */
  const reveal = useCallback(
    (quote: string) => {
      const root = editorContent(containerRef.current);
      const range = root ? rangeFor(root, quote) : null;
      const target = range?.startContainer.parentElement;
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      return Boolean(target);
    },
    [containerRef],
  );

  return { missing, reveal };
}

/**
 * A small "Comment" button over text selected in the editor. It sits in
 * `containerRef` (which must be position: relative) so it scrolls with it.
 */
export function SelectionCommentButton({
  containerRef,
  onComment,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onComment: (quote: string) => void;
}) {
  const [spot, setSpot] = useState<{ top: number; left: number; quote: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      const root = editorContent(container);
      const selection = document.getSelection();
      if (!container || !root || !selection || selection.isCollapsed || !selection.rangeCount) {
        setSpot(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        setSpot(null);
        return;
      }
      const quote = cleanQuote(selection.toString());
      if (quote.length < 2) {
        setSpot(null);
        return;
      }
      const box = range.getBoundingClientRect();
      const frame = container.getBoundingClientRect();
      setSpot({
        top: Math.max(4, box.top - frame.top - 38),
        left: Math.min(Math.max(box.left - frame.left + box.width / 2, 48), frame.width - 48),
        quote,
      });
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [containerRef]);

  if (!spot) return null;
  return (
    <button
      type="button"
      // Keep the selection: a mousedown here would otherwise clear it first.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        onComment(spot.quote);
        setSpot(null);
      }}
      style={{ top: spot.top, left: spot.left }}
      className="absolute z-20 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--i-ink)] px-3 text-[12.5px] font-medium text-[var(--i-bg)] shadow-[var(--i-shadow)] transition-transform hover:scale-[1.03]"
    >
      <ChatCircle size={14} weight="fill" /> Comment
    </button>
  );
}

/** The quoted text a thread points at: a thin bar in the editor's highlight yellow, then the words. */
function QuoteLine({ quote, faded, struck }: { quote: string; faded?: boolean; struck?: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 gap-2.5">
      <span aria-hidden className={cn("w-[3px] shrink-0 rounded-full", faded ? "bg-[var(--i-line-strong)]" : "bg-yellow-400")} />
      <span
        className={cn(
          "line-clamp-2 text-[12px] leading-[1.5] text-[var(--i-muted)] group-hover/quote:text-[var(--i-ink-2)]",
          struck && "line-through decoration-[var(--i-faint)]",
        )}
      >
        {quote}
      </span>
    </span>
  );
}

/** One comment: avatar, name and time on a line, the words under the name. */
function Message({ actor, at, body, action }: { actor: string; at: string; body: string; action?: ReactNode }) {
  const name = nameFromEmail(actor);
  return (
    <div>
      <div className="flex min-h-7 items-center gap-2">
        <TeamAvatar name={name} email={actor} size={24} />
        <span className="truncate text-[13px] font-medium text-[var(--i-ink)]">{name}</span>
        <span title={formatDate(at)} suppressHydrationWarning className="shrink-0 text-[11.5px] text-[var(--i-faint)]">
          {relativeDate(at)}
        </span>
        {action ? <span className="ml-auto flex shrink-0">{action}</span> : null}
      </div>
      <p className="whitespace-pre-wrap break-words pl-8 text-[13px] leading-[1.55] text-[var(--i-ink-2)]">{body}</p>
    </div>
  );
}

/**
 * A text box with no frame of its own, for inside a framed composer: the
 * frame shows focus, so the dashboard's focus outline would be a second box.
 */
const bareTextarea =
  "block w-full resize-none bg-transparent text-[13px] leading-[1.5] text-[var(--i-ink)] !outline-none placeholder:text-[var(--i-faint)]";

const smallButton = (variant: "primary" | "ghost") => cn(buttonClass(variant, "sm"), "h-7 px-3 text-[12.5px]");

/** "⌘ Enter" on a Mac, "Ctrl Enter" elsewhere. */
const noSubscribe = () => () => {};
function SendHint() {
  const mac = useSyncExternalStore(noSubscribe, () => /Mac|iPhone|iPad/.test(navigator.platform), () => true);
  return <span className="text-[11px] text-[var(--i-faint)] max-md:hidden">{mac ? "⌘" : "Ctrl"} Enter to send</span>;
}

type Send = (text: string, options: { quote?: string; threadId?: string }) => Promise<boolean>;

function Thread({
  thread,
  active,
  missing,
  busy,
  onFocus,
  onSend,
  onResolve,
}: {
  thread: CommentThread;
  active: boolean;
  missing: boolean;
  busy: boolean;
  onFocus: () => void;
  onSend: Send;
  onResolve: (resolved: boolean) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const { root, replies } = thread;
  const resolved = Boolean(root.resolved_at);
  const sendReply = () => {
    if (!reply.trim() || busy) return;
    void onSend(reply, { threadId: root.id }).then((ok) => {
      if (!ok) return;
      setReply("");
      setReplying(false);
    });
  };

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border bg-[var(--i-panel)] transition-[border-color,box-shadow]",
        active
          ? "border-yellow-400/70 shadow-[0_0_0_3px_rgb(250_204_21/0.14)]"
          : "border-[var(--i-line)] focus-within:border-[var(--i-line-strong)] hover:border-[var(--i-line-strong)]",
      )}
    >
      {root.quote ? (
        <button
          type="button"
          onClick={onFocus}
          title={missing ? "This text isn't in the post anymore" : "Show it in the post"}
          className="group/quote flex w-full flex-col gap-1 px-3 pt-3 text-left"
        >
          <QuoteLine quote={root.quote} faded={resolved || missing} struck={missing} />
          {missing && !resolved ? (
            <span className="pl-[13px] text-[11px] text-[var(--i-faint)]">The text has changed since this comment.</span>
          ) : null}
        </button>
      ) : null}

      <div className="space-y-2.5 px-3 pb-3 pt-2">
        <Message
          actor={root.actor}
          at={root.created_at}
          body={root.body}
          action={
            resolved ? null : (
              <button
                type="button"
                disabled={busy}
                onClick={() => onResolve(true)}
                aria-label="Resolve"
                title="Resolve"
                className="flex size-7 items-center justify-center rounded-md text-[var(--i-faint)] transition-colors hover:bg-[var(--i-hover)] hover:text-emerald-600 disabled:opacity-50 dark:hover:text-emerald-400"
              >
                <Check size={15} weight="bold" />
              </button>
            )
          }
        />
        {replies.map((item) => (
          <Message key={item.id} actor={item.actor} at={item.created_at} body={item.body} />
        ))}
      </div>

      {resolved ? (
        <div className="flex items-center gap-2 border-t border-[var(--i-line)] bg-[var(--i-sunken)] px-3 py-1.5 text-[12px] text-[var(--i-muted)]">
          <CheckCircle size={14} weight="fill" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="min-w-0 flex-1 truncate">Resolved by {nameFromEmail(root.resolved_by ?? "")}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve(false)}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 font-medium text-[var(--i-ink-2)] hover:bg-[var(--i-hover)] disabled:opacity-50"
          >
            <ArrowCounterClockwise size={13} /> Reopen
          </button>
        </div>
      ) : replying ? (
        <div className="border-t border-[var(--i-line)] px-3 pb-2 pt-2.5">
          <textarea
            value={reply}
            autoFocus
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                sendReply();
              }
              if (event.key === "Escape" && !reply.trim()) setReplying(false);
            }}
            rows={2}
            maxLength={5000}
            placeholder="Reply"
            aria-label="Reply"
            className={bareTextarea}
          />
          <div className="mt-1.5 flex items-center justify-end gap-1">
            <span className="mr-auto">
              <SendHint />
            </span>
            <button type="button" onClick={() => setReplying(false)} className={smallButton("ghost")}>
              Cancel
            </button>
            <button type="button" disabled={!reply.trim() || busy} onClick={sendReply} className={smallButton("primary")}>
              {busy ? <CircleNotch size={13} className="animate-spin" /> : null} Reply
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setReplying(true)}
          className="flex h-9 w-full items-center gap-2 border-t border-[var(--i-line)] px-3 text-left text-[12.5px] text-[var(--i-faint)] transition-colors hover:bg-[var(--i-hover)] hover:text-[var(--i-muted)]"
        >
          <ArrowBendUpLeft size={13} /> Reply
        </button>
      )}
    </li>
  );
}

export function CommentsPanel({
  threads,
  missing,
  activeId,
  onActivate,
  pendingQuote,
  clearQuote,
  composerRef,
  busy,
  onSend,
  onResolve,
}: {
  threads: CommentThread[];
  missing: Set<string>;
  activeId: string | null;
  onActivate: (thread: CommentThread) => void;
  pendingQuote: string;
  clearQuote: () => void;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  busy: boolean;
  onSend: Send;
  onResolve: (threadId: string, resolved: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const open = threads.filter((thread) => !thread.root.resolved_at);
  const resolved = threads.filter((thread) => thread.root.resolved_at);
  const sending = useRef(false);

  const send = async () => {
    if (sending.current || !text.trim()) return;
    sending.current = true;
    const ok = await onSend(text, { quote: pendingQuote || undefined });
    sending.current = false;
    if (ok) {
      setText("");
      clearQuote();
    }
  };

  const list = (items: CommentThread[]) => (
    <ul className="space-y-2.5">
      {items.map((thread) => (
        <Thread
          key={thread.root.id}
          thread={thread}
          active={thread.root.id === activeId}
          missing={missing.has(thread.root.id)}
          busy={busy}
          onFocus={() => onActivate(thread)}
          onSend={onSend}
          onResolve={(value) => onResolve(thread.root.id, value)}
        />
      ))}
    </ul>
  );

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium">Comments</h2>
        {open.length ? (
          <span className="text-[12px] tabular-nums text-[var(--i-muted)]">{open.length} open</span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[12px] text-[var(--i-muted)]">Select text in the post to comment on it.</p>

      {/* New comment first, so text picked in the post lands right under the heading. */}
      <div className="mt-3 rounded-xl border border-[var(--i-line)] bg-[var(--i-sunken)] transition-colors focus-within:border-[var(--i-line-strong)] focus-within:bg-[var(--i-panel)]">
        {pendingQuote ? (
          <div className="flex items-start gap-2 px-3 pt-3">
            <QuoteLine quote={pendingQuote} />
            <button
              type="button"
              aria-label="Comment on the whole post instead"
              title="Comment on the whole post instead"
              onClick={clearQuote}
              className="-mr-1 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--i-faint)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
            >
              <X size={12} />
            </button>
          </div>
        ) : null}
        <textarea
          ref={composerRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void send();
            }
          }}
          rows={2}
          maxLength={5000}
          aria-label="New comment"
          placeholder={pendingQuote ? "Comment on the selected text" : "Comment on the whole post"}
          className={cn(bareTextarea, "px-3 pb-1 pt-2.5")}
        />
        <div className="flex items-center justify-end gap-2 px-2 pb-2 pl-3">
          <span className="mr-auto">
            <SendHint />
          </span>
          <button type="button" disabled={!text.trim() || busy} onClick={() => void send()} className={smallButton("primary")}>
            {busy ? <CircleNotch size={13} className="animate-spin" /> : null} Comment
          </button>
        </div>
      </div>

      <div className="mt-4">
        {open.length ? list(open) : <p className="py-1 text-[12.5px] text-[var(--i-faint)]">No open comments.</p>}
      </div>

      {resolved.length ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowResolved(!showResolved)}
            aria-expanded={showResolved}
            className="inline-flex items-center gap-1 text-[12px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
          >
            <CaretRight size={12} className={cn("transition-transform", showResolved && "rotate-90")} />
            Resolved
            <span className="tabular-nums text-[var(--i-faint)]">{resolved.length}</span>
          </button>
          {showResolved ? <div className="mt-2.5">{list(resolved)}</div> : null}
        </div>
      ) : null}
    </Card>
  );
}
