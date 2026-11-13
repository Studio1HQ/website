"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowSquareOut,
  CheckCircle,
  CircleNotch,
  Eye,
  GitCommit,
  ImageSquare,
  PaperPlaneTilt,
  RocketLaunch,
  Trash,
  WarningCircle,
  X,
  XCircle,
} from "@phosphor-icons/react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import {
  comment,
  deleteDraft,
  publish,
  requestReview,
  resolveComment,
  review,
  saveDraft,
} from "@/app/internal/(dashboard)/blog/actions";
import { COVER_ARTS, autoCoverArt, coverArtName, isCoverArt } from "@/lib/blog-cover-art";
import {
  commentThreads,
  nameFromEmail,
  normalizeTag,
  postChecks,
  slugify,
  type BlogEvent,
  type BlogFields,
  type BlogPostRow,
  type BlogStatus,
} from "@/lib/internal/blog/shared";
import type { BlogAccess } from "@/lib/internal/roles";
import { cn } from "@/lib/utils";
import { CommentsPanel, SelectionCommentButton, useQuoteHighlights } from "@/components/internal/blog/comments";
import { BlogStatusBadge } from "@/components/internal/blog/status";
import { useToast } from "@/components/internal/toast";
import { Avatar, Card, buttonClass, formatDate, inputClass, relativeDate, textareaClass } from "@/components/internal/ui";

const MarkdownEditor = dynamic(() => import("@/components/internal/blog/markdown-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center gap-2 text-[13px] text-[var(--i-muted)]">
      <CircleNotch size={16} className="animate-spin" /> Loading the editor…
    </div>
  ),
});

const SITE = "https://www.studio1hq.com";
const AUTOSAVE_MS = 1200;
/** After a save fails (the connection, the database), try again this much later. */
const RETRY_MS = 5000;
/** Vercel caps request bodies near 4.5 MB, so big images shrink in the browser first. */
const SHRINK_OVER_BYTES = 4 * 1024 * 1024;

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

function fieldsOf(post: BlogPostRow): BlogFields {
  return {
    title: post.title,
    seo_title: post.seo_title,
    slug: post.slug,
    description: post.description,
    tldr_summary: post.tldr_summary,
    tldr_bullets: post.tldr_bullets,
    tags: post.tags,
    authors: post.authors,
    publish_date: post.publish_date,
    unlisted: post.unlisted,
    cover_art: post.cover_art,
    banner_image: post.banner_image,
    banner_image_alt: post.banner_image_alt,
    body: post.body,
  };
}

async function shrinkImage(file: File): Promise<Blob> {
  if (file.size <= SHRINK_OVER_BYTES || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    return blob ?? file;
  } catch {
    return file;
  }
}

function Counter({ value, min, max }: { value: number; min?: number; max: number }) {
  const bad = value > max || (min !== undefined && value > 0 && value < min);
  return (
    <span className={cn("tabular-nums", bad ? "text-rose-600 dark:text-rose-400" : "text-[var(--i-faint)]")}>
      {value}/{max}
    </span>
  );
}

function Label({ children, hint, extra }: { children: ReactNode; hint?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <span className="text-[12.5px] font-medium text-[var(--i-ink-2)]">
        {children}
        {hint ? <span className="ml-1.5 font-normal text-[var(--i-faint)]">{hint}</span> : null}
      </span>
      {extra ? <span className="text-[11.5px]">{extra}</span> : null}
    </div>
  );
}

/** Chips with an input: Enter or comma adds, Backspace on empty removes the last. */
function ChipInput({
  values,
  onChange,
  placeholder,
  normalize = (value) => value.trim(),
  max,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  normalize?: (value: string) => string;
  max: number;
}) {
  const [draft, setDraft] = useState("");
  const commit = (raw: string) => {
    const added = raw
      .split(",")
      .map(normalize)
      .filter((value) => value && !values.includes(value));
    if (added.length) onChange([...values, ...added].slice(0, max));
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] px-1.5 py-1 focus-within:border-[var(--i-line-strong)]">
      {values.map((value, index) => (
        <span
          key={value}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px]",
            index === 0 && placeholder.includes("tag")
              ? "bg-[var(--i-accent-soft)] text-[var(--i-accent-text)]"
              : "bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]",
          )}
        >
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() => onChange(values.filter((item) => item !== value))}
            className="text-[var(--i-faint)] hover:text-[var(--i-ink)]"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      {values.length < max ? (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && commit(draft)}
          placeholder={values.length ? "" : placeholder}
          className="h-6 min-w-[90px] flex-1 border-0 bg-transparent px-1 text-[13px] shadow-none outline-none ring-0 placeholder:text-[var(--i-faint)] focus:outline-none focus:ring-0"
        />
      ) : null}
    </div>
  );
}

function eventLine(event: BlogEvent) {
  const who = nameFromEmail(event.actor);
  switch (event.kind) {
    case "review_requested": {
      const [first, ...rest] = event.body.split("\n");
      const to = first.startsWith("to:") ? first.slice(3).split(",").filter(Boolean).map(nameFromEmail) : [];
      return { icon: <PaperPlaneTilt size={13} />, text: `${who} asked ${to.join(", ") || "a reviewer"} for a review`, note: (first.startsWith("to:") ? rest : [first, ...rest]).join("\n").trim() };
    }
    case "changes_requested":
      return { icon: <XCircle size={13} className="text-amber-600" />, text: `${who} requested changes`, note: event.body };
    case "approved":
      return { icon: <CheckCircle size={13} className="text-emerald-600" />, text: `${who} approved`, note: event.body };
    case "published":
      return { icon: <RocketLaunch size={13} className="text-sky-600" />, text: `${who} published`, note: "", link: event.body };
    default:
      return { icon: <PaperPlaneTilt size={13} />, text: who, note: event.body };
  }
}

export type EditorProps = {
  post: BlogPostRow;
  events: BlogEvent[];
  me: { email: string; blog: BlogAccess };
  reviewers: { email: string; name: string }[];
  takenSlugs: string[];
  /** The URL a live post already has; it can't change. */
  liveSlug: string | null;
  githubReady: boolean;
};

export function BlogEditor({ post, events, me, reviewers, takenSlugs, liveSlug, githubReady }: EditorProps) {
  const router = useRouter();
  const toast = useToast();
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const isReviewer = me.blog === "reviewer";
  const isLive = Boolean(post.source_path);

  const [fields, setFields] = useState<BlogFields>(() => fieldsOf(post));
  const [status, setStatus] = useState<BlogStatus>(post.status);
  const [base, setBase] = useState(post.updated_at);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<"request" | "review" | null>(null);
  const [picked, setPicked] = useState<string[]>(() => post.reviewers.filter((email) => email !== me.email));
  const [message, setMessage] = useState("");
  const [pendingQuote, setPendingQuote] = useState("");
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [showArt, setShowArt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmForce, setConfirmForce] = useState<string | null>(null);
  const [published, setPublished] = useState<{ url: string; commitUrl: string } | null>(null);
  /** Why the server refused the text (raw HTML), until it's edited and saves. */
  const [rejection, setRejection] = useState<string | null>(null);

  const writingRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const threads = useMemo(() => commentThreads(events), [events]);
  const timeline = useMemo(() => events.filter((event) => event.kind !== "comment"), [events]);
  const { missing, reveal } = useQuoteHighlights(writingRef, threads, activeThread, version);

  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const baseRef = useRef(base);
  const dirty = useRef(new Set<keyof BlogFields>());
  const saving = useRef(false);
  const conflict = useRef(false);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(<K extends keyof BlogFields>(key: K, value: BlogFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    dirty.current.add(key);
    setSaveState((state) => (state === "conflict" ? state : "dirty"));
    setVersion((v) => v + 1);
  }, []);

  const flush = useCallback(async () => {
    if (saving.current || conflict.current || dirty.current.size === 0) return;
    saving.current = true;
    setSaveState("saving");
    const keys = [...dirty.current];
    dirty.current.clear();
    const patch = Object.fromEntries(keys.map((key) => [key, fieldsRef.current[key]]));
    const result = await saveDraft(post.id, patch, baseRef.current).catch(() => ({
      ok: false as const,
      message: "Couldn't save. Check your connection.",
    }));
    saving.current = false;
    if (retry.current) clearTimeout(retry.current);
    retry.current = null;
    if (result.ok) {
      baseRef.current = result.updated_at;
      setBase(result.updated_at);
      setStatus(result.status);
      setRejection(null);
      setSaveState(dirty.current.size ? "dirty" : "saved");
      if (dirty.current.size) setVersion((v) => v + 1);
      if (result.slugTaken) toast("error", "Another post already uses that URL. Everything else is saved: pick a different URL.");
      return;
    }
    keys.forEach((key) => dirty.current.add(key));
    if ("conflict" in result && result.conflict) {
      conflict.current = true;
      setSaveState("conflict");
    } else if ("rejected" in result && result.rejected) {
      // The text itself was refused: the next edit tries again, a timer wouldn't help.
      setSaveState("error");
      setRejection(result.message);
    } else {
      setSaveState("error");
      toast("error", result.message);
      retry.current = setTimeout(() => setVersion((v) => v + 1), RETRY_MS);
    }
  }, [post.id, toast]);

  useEffect(
    () => () => {
      if (retry.current) clearTimeout(retry.current);
    },
    [],
  );

  // Autosave a moment after the last change.
  useEffect(() => {
    if (!dirty.current.size) return;
    const timer = setTimeout(() => void flush(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [version, flush]);

  const saveNow = useCallback(async () => {
    while (saving.current) await new Promise((resolve) => setTimeout(resolve, 80));
    await flush();
    while (saving.current) await new Promise((resolve) => setTimeout(resolve, 80));
    return !conflict.current && dirty.current.size === 0;
  }, [flush]);

  // Cmd/Ctrl+S saves now; leaving with unsaved edits asks first.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirty.current.size || saving.current) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [saveNow]);

  // After a review action or a publish the server's copy is newer: take it
  // (publishing also moves image links into the site's folder).
  useEffect(() => {
    if (!dirty.current.size && !saving.current) setStatus(post.status);
  }, [post.status]);
  useEffect(() => {
    if (Date.parse(post.updated_at) === Date.parse(baseRef.current) || dirty.current.size || saving.current) return;
    baseRef.current = post.updated_at;
    setBase(post.updated_at);
    setStatus(post.status);
    const next = fieldsOf(post);
    if (next.body !== fieldsRef.current.body) editorRef.current?.setMarkdown(next.body);
    setFields(next);
  }, [post]);

  const uploadImage = useCallback(
    async (file: File) => {
      const form = new FormData();
      form.append("file", await shrinkImage(file), file.name);
      const response = await fetch(`/internal/blog-media/${post.id}`, { method: "POST", body: form });
      const json = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        const reason = json.error ?? (response.status === 413 ? "That image is too large." : "The upload failed.");
        toast("error", reason);
        throw new Error(reason);
      }
      return json.url;
    },
    [post.id, toast],
  );

  const checks = useMemo(() => postChecks(fields, takenSlugs), [fields, takenSlugs]);
  const errors = checks.filter((check) => check.level === "error");
  const warnings = checks.filter((check) => check.level === "warning");
  const autoArt = autoCoverArt(fields.title, fields.tags);
  const art = isCoverArt(fields.cover_art) ? fields.cover_art : autoArt;
  const isOwner = post.created_by === me.email;
  // A live post with nothing changed has nothing to review or publish.
  const canRequest = status !== "published";
  // Publishing needs an approval, except for the reviewer's own post.
  const canPublish = status === "approved" || (isOwner && status !== "published");
  const liveUrl = `${SITE}/blog/${liveSlug ?? fields.slug}`;

  const setTitle = (title: string) => {
    const previous = fieldsRef.current;
    update("title", title);
    // The slug follows the title until someone edits it, and never for a live post.
    if (!liveSlug && (!previous.slug || previous.slug === slugify(previous.title))) update("slug", slugify(title));
  };

  const run = async (key: string, action: () => Promise<{ ok: boolean; message?: string }>, done: string) => {
    if (!(await saveNow())) {
      toast("error", "Save your changes first.");
      return false;
    }
    setBusy(key);
    const result = await action().catch(() => ({ ok: false, message: "Something went wrong. Try again." }));
    setBusy(null);
    if (!result.ok) {
      toast("error", result.message ?? "Something went wrong.");
      return false;
    }
    toast("success", done);
    router.refresh();
    return true;
  };

  const sendForReview = async () => {
    const ok = await run("request", () => requestReview(post.id, picked, message), "Review requested. The reviewers have been told.");
    if (ok) {
      setPanel(null);
      setMessage("");
    }
  };

  const sendReview = async (verdict: "changes" | "approve") => {
    const ok = await run(
      verdict,
      () => review(post.id, verdict, message),
      verdict === "changes" ? "Sent back to the writer with your notes." : "Approved.",
    );
    if (ok) {
      setPanel(null);
      setMessage("");
    }
  };

  const doPublish = async (force = false) => {
    if (!(await saveNow())) {
      toast("error", "Save your changes first.");
      return;
    }
    setBusy("publish");
    const result = await publish(post.id, baseRef.current, force).catch(() => ({ ok: false as const, message: "Couldn't publish. Try again." }));
    setBusy(null);
    if (result.ok) {
      setConfirmForce(null);
      setPublished({ url: result.url, commitUrl: result.commitUrl });
      if (result.warning) toast("error", result.warning);
      else toast("success", "Published. It goes live in a few minutes.");
      router.refresh();
    } else if ("conflict" in result && result.conflict) {
      setConfirmForce(result.message);
    } else {
      toast("error", result.message);
    }
  };

  const sendComment = (text: string, options: { quote?: string; threadId?: string }) =>
    run("comment", () => comment(post.id, text, options.quote, options.threadId), options.threadId ? "Reply added." : "Comment added.");

  const resolveThread = (threadId: string, resolved: boolean) =>
    void run("comment", () => resolveComment(post.id, threadId, resolved), resolved ? "Resolved." : "Opened again.");

  const commentOnSelection = (quote: string) => {
    setPendingQuote(quote);
    setActiveThread(null);
    composerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    composerRef.current?.focus({ preventScroll: true });
  };


  const remove = async () => {
    setBusy("delete");
    const result = await deleteDraft(post.id);
    setBusy(null);
    if (!result.ok) {
      toast("error", result.message);
      return;
    }
    dirty.current.clear();
    toast("success", "Draft deleted.");
    router.push("/internal/blog");
  };

  const pickBanner = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif,image/avif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy("banner");
      try {
        update("banner_image", await uploadImage(file));
      } catch {
        // uploadImage already said why.
      }
      setBusy(null);
    };
    input.click();
  };

  const saveLabel: Record<SaveState, ReactNode> = {
    saved: <><CheckCircle size={13} className="text-emerald-600" /> Saved</>,
    dirty: <>Unsaved changes</>,
    saving: <><CircleNotch size={13} className="animate-spin" /> Saving…</>,
    error: <><WarningCircle size={13} className="text-rose-600" /> Not saved</>,
    conflict: <><WarningCircle size={13} className="text-rose-600" /> Not saved</>,
  };

  return (
    <div className="pb-10">
      {/* Top bar */}
      <div className="sticky top-0 z-30 -mx-4 mb-5 flex flex-wrap items-center gap-2 border-b border-[var(--i-line)] bg-[var(--i-bg)]/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <Link href="/internal/blog" className={buttonClass("ghost", "sm")}>
          <ArrowLeft size={14} /> Blog
        </Link>
        <BlogStatusBadge status={status} live={isLive} />
        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--i-muted)]" aria-live="polite">
          {saveLabel[saveState]}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a
            href={`/internal/blog-preview/${post.id}`}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              // Save first, so the preview shows what's on screen. The tab opens
              // straight away (browsers block one opened after a wait).
              event.preventDefault();
              const href = event.currentTarget.href;
              const tab = window.open("", "_blank");
              void saveNow().then(() => {
                if (tab) tab.location.href = href;
                else window.location.href = href;
              });
            }}
            className={buttonClass("secondary", "sm")}
          >
            <Eye size={14} /> Preview
          </a>
          {canRequest ? (
            <button
              type="button"
              onClick={() => setPanel(panel === "request" ? null : "request")}
              className={buttonClass(isReviewer ? "secondary" : "accent", "sm")}
            >
              <PaperPlaneTilt size={14} /> {status === "in_review" ? "Add reviewers" : "Ask for review"}
            </button>
          ) : null}
          {isReviewer ? (
            <>
              {status === "in_review" || status === "approved" || status === "changes_requested" ? (
                <button
                  type="button"
                  onClick={() => setPanel(panel === "review" ? null : "review")}
                  className={buttonClass("secondary", "sm")}
                >
                  <CheckCircle size={14} /> Review
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy === "publish" || errors.length > 0 || !githubReady || !canPublish}
                title={
                  !githubReady
                    ? "Publishing isn't set up yet (GITHUB_TOKEN)"
                    : errors.length
                      ? "Fix the checks marked in red first"
                      : status === "published"
                        ? "Already live. Edit something to publish again."
                        : !canPublish
                          ? "Approve this post first (Review), then publish it."
                          : "Commit the post to the site. It goes live in a few minutes."
                }
                onClick={() => void doPublish()}
                className={buttonClass("accent", "sm")}
              >
                {busy === "publish" ? <CircleNotch size={14} className="animate-spin" /> : <RocketLaunch size={14} />}
                {isLive ? "Publish changes" : "Publish"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {saveState === "conflict" ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <WarningCircle size={16} />
          Someone else changed this post while you were editing. Copy anything you need, then reload to see their version.
          <button type="button" onClick={() => window.location.reload()} className={buttonClass("secondary", "sm")}>
            Reload
          </button>
        </div>
      ) : null}

      {rejection && saveState === "error" ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <WarningCircle size={16} />
          Not saved. {rejection}
        </div>
      ) : null}

      {confirmForce ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <WarningCircle size={16} />
          {confirmForce}
          <button type="button" onClick={() => void doPublish(true)} className={buttonClass("danger", "sm")}>
            Publish anyway
          </button>
          <button type="button" onClick={() => setConfirmForce(null)} className={buttonClass("ghost", "sm")}>
            Cancel
          </button>
        </div>
      ) : null}

      {published || (status === "published" && isLive) ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-[13px] text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          <RocketLaunch size={16} />
          {published ? "Published. The site redeploys in a few minutes, then it's live at" : "Live at"}
          <a href={published?.url ?? liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium underline">
            {(published?.url ?? liveUrl).replace("https://", "")} <ArrowSquareOut size={12} />
          </a>
          {published ? (
            <a href={published.commitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700 underline dark:text-sky-300">
              <GitCommit size={13} /> Commit
            </a>
          ) : null}
        </div>
      ) : null}

      {panel === "request" ? (
        <Card className="mb-4 p-4">
          <p className="text-[13.5px] font-medium">Who should review this post?</p>
          <p className="mb-3 mt-0.5 text-[12.5px] text-[var(--i-muted)]">
            They&apos;ll get an email and see it waiting in their Blog list.
          </p>
          {reviewers.length ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {reviewers.map((person) => {
                const on = picked.includes(person.email);
                return (
                  <label
                    key={person.email}
                    className={cn(
                      "inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border pl-1 pr-3 text-[12.5px]",
                      on
                        ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)] text-[var(--i-accent-text)]"
                        : "border-[var(--i-line)] bg-[var(--i-panel)] hover:bg-[var(--i-hover)]",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => setPicked(on ? picked.filter((email) => email !== person.email) : [...picked, person.email])}
                    />
                    <Avatar name={person.name} email={person.email} size={24} />
                    {person.name}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 text-[12.5px] text-[var(--i-muted)]">No blog reviewers yet. An admin can add one on the Team page.</p>
          )}
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={2}
            placeholder="A note for the reviewers (optional)"
            className={textareaClass}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!picked.length || busy === "request"}
              onClick={() => void sendForReview()}
              className={buttonClass("accent", "sm")}
            >
              <PaperPlaneTilt size={14} /> Send for review
            </button>
            <button type="button" onClick={() => setPanel(null)} className={buttonClass("ghost", "sm")}>
              Cancel
            </button>
          </div>
          {errors.length ? (
            <p className="mt-2 text-[12px] text-amber-700 dark:text-amber-300">
              {errors.length} check{errors.length === 1 ? "" : "s"} still need fixing before it can be published.
            </p>
          ) : null}
        </Card>
      ) : null}

      {panel === "review" ? (
        <Card className="mb-4 p-4">
          <p className="mb-2 text-[13.5px] font-medium">Your review</p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder="What should change? (needed for Request changes, optional for Approve)"
            className={textareaClass}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === "changes" || !message.trim()}
              onClick={() => void sendReview("changes")}
              className={buttonClass("secondary", "sm")}
            >
              <XCircle size={14} /> Request changes
            </button>
            <button
              type="button"
              disabled={busy === "approve"}
              onClick={() => void sendReview("approve")}
              className={buttonClass("primary", "sm")}
            >
              <CheckCircle size={14} /> Approve
            </button>
            <button type="button" onClick={() => setPanel(null)} className={buttonClass("ghost", "sm")}>
              Cancel
            </button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Writing */}
        <div className="min-w-0">
          <textarea
            value={fields.title}
            onChange={(event) => setTitle(event.target.value.replace(/\n/g, " "))}
            rows={1}
            placeholder="Post title"
            aria-label="Title"
            className="mb-3 w-full resize-none overflow-hidden bg-transparent text-[30px] font-medium leading-tight tracking-[-0.02em] outline-none placeholder:text-[var(--i-faint)] [field-sizing:content]"
          />
          <div ref={writingRef} className="relative rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
            <SelectionCommentButton containerRef={writingRef} onComment={commentOnSelection} />
            <MarkdownEditor
              markdown={post.body}
              onChange={(body) => {
                // The editor can report the same text again (e.g. once an image loads).
                if (body !== fieldsRef.current.body) update("body", body);
              }}
              uploadImage={uploadImage}
              editorRef={editorRef}
              onError={(error) => toast("error", `The editor couldn't read part of this post: ${error.slice(0, 160)}`)}
            />
          </div>
          <p className="mt-2 text-[12px] text-[var(--i-faint)]">
            Saves automatically. Paste from Notion or Google Docs to keep links and headings. Drop or paste images
            to upload them. Use ## for section headings. Select text to comment on it.
          </p>
        </div>

        {/* Details, cover, checks, activity */}
        <div className="space-y-4 xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto xl:pb-4">
          <Card className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium">
              {errors.length ? (
                <><WarningCircle size={15} className="text-rose-600" /> {errors.length} to fix before publishing</>
              ) : (
                <><CheckCircle size={15} className="text-emerald-600" /> Ready to publish</>
              )}
            </p>
            {checks.length ? (
              <ul className="space-y-1.5">
                {[...errors, ...warnings].map((check) => (
                  <li key={check.id} className="flex gap-2 text-[12.5px] leading-snug">
                    <span
                      aria-hidden
                      className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", check.level === "error" ? "bg-rose-500" : "bg-amber-400")}
                    />
                    <span className={check.level === "error" ? "text-[var(--i-ink)]" : "text-[var(--i-muted)]"}>{check.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-[var(--i-muted)]">Everything looks good.</p>
            )}
          </Card>

          <Card className="space-y-3.5 p-4">
            <p className="text-[13px] font-medium">Post details</p>
            <div>
              <Label hint="for Google and social cards" extra={<Counter value={fields.seo_title.trim().length} max={60} />}>
                SEO title
              </Label>
              <input
                value={fields.seo_title}
                onChange={(event) => update("seo_title", event.target.value)}
                placeholder={fields.title.length > 60 ? "Required: the title is over 60 characters" : "Optional when the title is short"}
                className={inputClass()}
              />
            </div>
            <div>
              <Label hint={liveSlug ? "a live post's URL can't change" : undefined}>URL</Label>
              <div className="flex h-9 items-center rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)] pl-3 text-[13px] text-[var(--i-muted)] transition-colors focus-within:border-[var(--i-line-strong)] focus-within:bg-[var(--i-panel)]">
                /blog/
                <input
                  value={fields.slug}
                  disabled={Boolean(liveSlug)}
                  onChange={(event) => update("slug", event.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                  className="h-full min-w-0 flex-1 rounded-r-lg bg-transparent pl-0.5 pr-3 text-[var(--i-ink)] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
            <div>
              <Label extra={<Counter value={fields.description.trim().length} min={50} max={160} />}>SEO description</Label>
              <textarea
                value={fields.description}
                onChange={(event) => update("description", event.target.value.replace(/\n/g, " "))}
                rows={3}
                placeholder="140 to 160 characters, main keyword early. Shown in Google and on blog cards."
                className={textareaClass}
              />
            </div>
            <div>
              <Label hint="3 to 6; the first is the topic label">Tags</Label>
              <ChipInput
                values={fields.tags}
                onChange={(tags) => update("tags", tags)}
                normalize={normalizeTag}
                placeholder="Add a tag, then Enter"
                max={12}
              />
            </div>
            <div>
              <Label>Authors</Label>
              <ChipInput
                values={fields.authors}
                onChange={(authors) => update("authors", authors)}
                placeholder="Full name, then Enter"
                max={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label hint="blank = publish day">Date</Label>
                <input
                  type="date"
                  value={fields.publish_date ?? ""}
                  onChange={(event) => update("publish_date", event.target.value || null)}
                  className={inputClass()}
                />
              </div>
              <label className="flex cursor-pointer items-end gap-2 pb-1.5 text-[12.5px] text-[var(--i-ink-2)]">
                <input
                  type="checkbox"
                  checked={fields.unlisted}
                  onChange={(event) => update("unlisted", event.target.checked)}
                  className="size-4 accent-[var(--i-accent)]"
                />
                Hide from /blog
              </label>
            </div>
            <div>
              <Label hint="optional; the SEO description is used if empty">TL;DR</Label>
              <textarea
                value={fields.tldr_summary}
                onChange={(event) => update("tldr_summary", event.target.value)}
                rows={2}
                className={textareaClass}
              />
            </div>
            <div>
              <Label hint="3 or 4, one per line">TL;DR bullets</Label>
              <textarea
                value={fields.tldr_bullets.join("\n")}
                onChange={(event) => update("tldr_bullets", event.target.value.split("\n").slice(0, 4))}
                rows={4}
                className={textareaClass}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium">Cover</p>
              {fields.banner_image ? (
                <button type="button" onClick={() => update("banner_image", null)} className={buttonClass("ghost", "sm")}>
                  Use the generated cover
                </button>
              ) : (
                <button type="button" onClick={() => setShowArt(!showArt)} className={buttonClass("ghost", "sm")}>
                  {showArt ? "Done" : "Change illustration"}
                </button>
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${fields.banner_image}-${base}`}
              src={fields.banner_image ?? `/internal/blog-cover/${post.id}?w=480&v=${encodeURIComponent(base)}`}
              alt={fields.banner_image ? fields.banner_image_alt ?? "" : "Generated cover"}
              className="aspect-[16/9] w-full rounded-lg bg-[#f4efe7] object-cover ring-1 ring-[var(--i-line)]"
            />
            {fields.banner_image ? (
              <input
                value={fields.banner_image_alt ?? ""}
                onChange={(event) => update("banner_image_alt", event.target.value)}
                placeholder="Describe the image (alt text)"
                className={cn(inputClass(), "mt-2")}
              />
            ) : (
              <p className="mt-2 text-[12px] text-[var(--i-muted)]">
                {coverArtName(art)} · {isCoverArt(fields.cover_art) ? "chosen" : "picked from the title"}. Made automatically; no
                upload needed.
              </p>
            )}
            {showArt && !fields.banner_image ? (
              <div className="mt-3 grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => update("cover_art", null)}
                  className={cn(
                    "rounded-lg p-1 text-left text-[11.5px] ring-1",
                    !isCoverArt(fields.cover_art) ? "ring-2 ring-[var(--i-accent)]" : "ring-[var(--i-line)] hover:ring-[var(--i-line-strong)]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/internal/blog-cover/${post.id}?w=480&art=${autoArt}&v=${encodeURIComponent(base)}`}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/9] w-full rounded-md bg-[#f4efe7] object-cover"
                  />
                  <span className="mt-1 block truncate px-0.5">Automatic ({coverArtName(autoArt)})</span>
                </button>
                {COVER_ARTS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => update("cover_art", option.key)}
                    className={cn(
                      "rounded-lg p-1 text-left text-[11.5px] ring-1",
                      fields.cover_art === option.key ? "ring-2 ring-[var(--i-accent)]" : "ring-[var(--i-line)] hover:ring-[var(--i-line-strong)]",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/internal/blog-cover/${post.id}?w=480&art=${option.key}&v=${encodeURIComponent(base)}`}
                      alt=""
                      loading="lazy"
                      className="aspect-[16/9] w-full rounded-md bg-[#f4efe7] object-cover"
                    />
                    <span className="mt-1 block truncate px-0.5">{option.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {!fields.banner_image ? (
              <button type="button" disabled={busy === "banner"} onClick={pickBanner} className={cn(buttonClass("ghost", "sm"), "mt-2")}>
                {busy === "banner" ? <CircleNotch size={14} className="animate-spin" /> : <ImageSquare size={14} />} Upload your own
                image instead
              </button>
            ) : null}
          </Card>

          <CommentsPanel
            threads={threads}
            missing={missing}
            activeId={activeThread}
            onActivate={(thread) => {
              setActiveThread(thread.root.id);
              if (thread.root.quote && !reveal(thread.root.quote)) toast("error", "That text isn't in the post anymore.");
            }}
            pendingQuote={pendingQuote}
            clearQuote={() => setPendingQuote("")}
            composerRef={composerRef}
            busy={busy === "comment"}
            onSend={sendComment}
            onResolve={resolveThread}
          />

          <Card className="p-4">
            <p className="mb-3 text-[13px] font-medium">Activity</p>
            <ol className="space-y-3">
              <li className="flex gap-2 text-[12.5px] text-[var(--i-muted)]">
                <Avatar name={nameFromEmail(post.created_by)} email={post.created_by} size={24} />
                <span className="pt-0.5">
                  {nameFromEmail(post.created_by)} started this post ·{" "}
                  <span title={formatDate(post.created_at)} suppressHydrationWarning>
                    {relativeDate(post.created_at)}
                  </span>
                </span>
              </li>
              {timeline.map((event) => {
                const line = eventLine(event);
                return (
                  <li key={event.id} className="flex gap-2 text-[12.5px]">
                    <Avatar name={nameFromEmail(event.actor)} email={event.actor} size={24} />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="flex flex-wrap items-center gap-1 text-[var(--i-muted)]">
                        {line.icon}
                        <span className="font-medium text-[var(--i-ink-2)]">{line.text}</span>·
                        <span title={formatDate(event.created_at)} suppressHydrationWarning>
                          {relativeDate(event.created_at)}
                        </span>
                        {"link" in line && line.link ? (
                          <a href={line.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
                            commit <ArrowSquareOut size={11} />
                          </a>
                        ) : null}
                      </p>
                      {line.note ? (
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[var(--i-sunken)] px-2.5 py-1.5 text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]">
                          {line.note}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {!isLive && (isOwner || isReviewer) ? (
            <div className="flex items-center gap-2 px-1">
              {confirmDelete ? (
                <>
                  <span className="text-[12.5px] text-[var(--i-muted)]">Delete this draft for good?</span>
                  <button type="button" disabled={busy === "delete"} onClick={() => void remove()} className={buttonClass("danger", "sm")}>
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass("ghost", "sm")}>
                    Keep it
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className={buttonClass("ghost", "sm")}>
                  <Trash size={14} /> Delete draft
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
