"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ArrowBendUpLeft, ChatCircle, CheckCircle, CircleNotch, Quotes, X } from "@phosphor-icons/react";
import { cleanQuote, locateQuote, nameFromEmail, type CommentThread } from "@/lib/internal/blog/shared";
import { cn } from "@/lib/utils";
import { Avatar, Card, buttonClass, formatDate, relativeDate, textareaClass } from "@/components/internal/ui";

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

function Message({ actor, at, body }: { actor: string; at: string; body: string }) {
  return (
    <div className="flex gap-2 text-[12.5px]">
      <Avatar name={nameFromEmail(actor)} email={actor} size={24} />
      <div className="min-w-0 flex-1">
        <p className="text-[var(--i-muted)]">
          <span className="font-medium text-[var(--i-ink-2)]">{nameFromEmail(actor)}</span> ·{" "}
          <span title={formatDate(at)} suppressHydrationWarning>
            {relativeDate(at)}
          </span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[var(--i-ink)]">{body}</p>
      </div>
    </div>
  );
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

  return (
    <li
      className={cn(
        "rounded-lg p-2.5 ring-1 ring-inset transition-colors",
        active ? "bg-[var(--i-accent-soft)]/50 ring-[var(--i-accent)]/40" : "ring-[var(--i-line)]",
        resolved && "opacity-70",
      )}
    >
      {root.quote ? (
        <button
          type="button"
          onClick={onFocus}
          title={missing ? "This text isn't in the post anymore" : "Show it in the post"}
          className="mb-2 flex w-full gap-1.5 rounded-md border-l-2 border-amber-400 bg-amber-50/70 px-2 py-1 text-left text-[12px] text-[var(--i-ink-2)] hover:bg-amber-50 dark:bg-amber-400/10 dark:hover:bg-amber-400/15"
        >
          <Quotes size={12} className="mt-0.5 shrink-0 text-amber-600" />
          <span className={cn("line-clamp-3", missing && "line-through decoration-[var(--i-faint)]")}>{root.quote}</span>
        </button>
      ) : null}
      <div className="space-y-2.5">
        <Message actor={root.actor} at={root.created_at} body={root.body} />
        {replies.map((item) => (
          <Message key={item.id} actor={item.actor} at={item.created_at} body={item.body} />
        ))}
      </div>
      {missing && !resolved ? (
        <p className="mt-2 text-[11.5px] text-[var(--i-faint)]">The quoted text has changed since this comment.</p>
      ) : null}
      {resolved ? (
        <p className="mt-2 flex items-center gap-1 text-[11.5px] text-[var(--i-muted)]">
          <CheckCircle size={12} className="text-emerald-600" /> Resolved by {nameFromEmail(root.resolved_by ?? "")}
        </p>
      ) : null}
      {replying ? (
        <div className="mt-2.5">
          <textarea
            value={reply}
            autoFocus
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && reply.trim()) {
                event.preventDefault();
                void onSend(reply, { threadId: root.id }).then((ok) => ok && (setReply(""), setReplying(false)));
              }
            }}
            rows={2}
            placeholder="Reply"
            className={textareaClass}
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              disabled={!reply.trim() || busy}
              onClick={() => void onSend(reply, { threadId: root.id }).then((ok) => ok && (setReply(""), setReplying(false)))}
              className={buttonClass("secondary", "sm")}
            >
              {busy ? <CircleNotch size={13} className="animate-spin" /> : <ArrowBendUpLeft size={13} />} Reply
            </button>
            <button type="button" onClick={() => setReplying(false)} className={buttonClass("ghost", "sm")}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-1">
          <button type="button" onClick={() => setReplying(true)} className={buttonClass("ghost", "sm")}>
            <ArrowBendUpLeft size={13} /> Reply
          </button>
          <button type="button" disabled={busy} onClick={() => onResolve(!resolved)} className={buttonClass("ghost", "sm")}>
            <CheckCircle size={13} /> {resolved ? "Reopen" : "Resolve"}
          </button>
        </div>
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
    <ul className="space-y-2">
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
      <p className="mb-1 flex items-center justify-between text-[13px] font-medium">
        Comments
        {open.length ? <span className="text-[12px] font-normal text-[var(--i-muted)]">{open.length} open</span> : null}
      </p>
      <p className="mb-3 text-[12px] text-[var(--i-muted)]">Select text in the post to comment on it.</p>

      {open.length ? list(open) : <p className="text-[12.5px] text-[var(--i-faint)]">No open comments.</p>}

      {resolved.length ? (
        <div className="mt-3">
          <button type="button" onClick={() => setShowResolved(!showResolved)} className="text-[12px] text-[var(--i-muted)] underline-offset-2 hover:underline">
            {showResolved ? "Hide" : "Show"} {resolved.length} resolved
          </button>
          {showResolved ? <div className="mt-2">{list(resolved)}</div> : null}
        </div>
      ) : null}

      <div className="mt-3 border-t border-[var(--i-line)] pt-3">
        {pendingQuote ? (
          <div className="mb-2 flex gap-1.5 rounded-md border-l-2 border-amber-400 bg-amber-50/70 px-2 py-1 text-[12px] text-[var(--i-ink-2)] dark:bg-amber-400/10">
            <Quotes size={12} className="mt-0.5 shrink-0 text-amber-600" />
            <span className="line-clamp-3 flex-1">{pendingQuote}</span>
            <button type="button" aria-label="Comment on the whole post instead" onClick={clearQuote} className="text-[var(--i-faint)] hover:text-[var(--i-ink)]">
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
          placeholder={pendingQuote ? "Comment on the selected text" : "Comment on the whole post"}
          className={textareaClass}
        />
        <button type="button" disabled={!text.trim() || busy} onClick={() => void send()} className={cn(buttonClass("secondary", "sm"), "mt-2")}>
          {busy ? <CircleNotch size={14} className="animate-spin" /> : <ChatCircle size={14} />} Comment
        </button>
      </div>
    </Card>
  );
}
