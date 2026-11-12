"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ImageSquare, UploadSimple, X } from "@phosphor-icons/react";
import {
  closeImageDialog$,
  imageDialogState$,
  imageUploadHandler$,
  saveImage$,
  useCellValues,
  usePublisher,
} from "@mdxeditor/editor";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/internal/ui";

/** Past this, screen readers tend to cut alt text short. */
const ALT_LIMIT = 125;

const field =
  "block w-full rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)] px-3 py-2 text-[13px] leading-relaxed text-[var(--i-ink)] outline-none transition-colors placeholder:text-[var(--i-faint)] focus:border-[var(--i-line-strong)] focus:bg-[var(--i-panel)]";

type Initial = { src?: string; altText?: string; title?: string };

/**
 * The editor's image dialog, in place of MDXEditor's own (markdown-editor.tsx
 * passes it to imagePlugin). Opens from "Insert image" and from the gear on
 * an image. Shows the image, takes an upload or a link, and gives the alt
 * text and caption room to be read. "Title" in Markdown is the caption under
 * the image on the blog (components/blog/mdx.tsx).
 */
export function ImageDialog() {
  const [state, upload] = useCellValues(imageDialogState$, imageUploadHandler$);
  const saveImage = usePublisher(saveImage$);
  const close = usePublisher(closeImageDialog$);
  if (state.type === "inactive") return null;
  return (
    <ImageForm
      key={state.type === "editing" ? state.nodeKey : "new"}
      editing={state.type === "editing"}
      initial={state.type === "editing" ? state.initialValues : {}}
      upload={upload}
      onSave={saveImage}
      onClose={close}
    />
  );
}

function ImageForm({
  editing,
  initial,
  upload,
  onSave,
  onClose,
}: {
  editing: boolean;
  initial: Initial;
  upload: ((file: File) => Promise<string>) | null;
  onSave: (values: { src: string; altText: string; title?: string }) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [src, setSrc] = useState(initial.src ?? "");
  const [alt, setAlt] = useState(initial.altText ?? "");
  const [caption, setCaption] = useState(initial.title ?? "");
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const altInput = useRef<HTMLTextAreaElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const closed = useRef(false);

  // The picked file's preview URL lives until it's replaced or the dialog closes.
  const pickedUrl = useRef<string | null>(null);
  useEffect(() => () => {
    if (pickedUrl.current) URL.revokeObjectURL(pickedUrl.current);
  }, []);

  const shown = picked?.url ?? src.trim();
  const canSave = Boolean(picked || src.trim()) && !busy;

  const pick = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (pickedUrl.current) URL.revokeObjectURL(pickedUrl.current);
    const url = URL.createObjectURL(file);
    pickedUrl.current = url;
    setPicked({ file, url });
  };
  const unpick = () => {
    if (pickedUrl.current) URL.revokeObjectURL(pickedUrl.current);
    pickedUrl.current = null;
    setPicked(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSave) return;
    let finalSrc = src.trim();
    if (picked) {
      if (!upload) return;
      setBusy(true);
      try {
        finalSrc = await upload(picked.file);
      } catch {
        // The upload handler has already said why (a toast); keep the dialog open.
        setBusy(false);
        return;
      }
      // Closed while it uploaded: the file is stored, but nothing changes in the post.
      if (closed.current) return;
    }
    onSave({ src: finalSrc, altText: oneLine(alt), title: oneLine(caption) || undefined });
  };

  // Enter saves (alt text and captions are one line in Markdown); the
  // fields wrap so long text stays readable.
  const enterSaves = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!busy) pick(event.dataTransfer.files[0]);
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (open) return;
        closed.current = true;
        onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (editing && altInput.current) {
              const input = altInput.current;
              input.focus();
              input.setSelectionRange(input.value.length, input.value.length);
            } else {
              uploadButton.current?.focus();
            }
          }}
          className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--i-line)] px-5 py-3.5">
            <div>
              <Dialog.Title className="text-[15px] font-medium">{editing ? "Edit image" : "Add an image"}</Dialog.Title>
              <Dialog.Description className="text-[12.5px] text-[var(--i-muted)]">
                Upload one or paste a link, then describe it.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              {/* The image itself, or a place to drop one (click it to pick a file). */}
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => {
                  if (!shown && upload && !busy) fileInput.current?.click();
                }}
                className={cn(
                  "flex h-[200px] items-center justify-center overflow-hidden rounded-xl border bg-[var(--i-sunken)] transition-colors",
                  dragging ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)]" : "border-[var(--i-line)]",
                  !shown && upload && "cursor-pointer border-dashed hover:border-[var(--i-line-strong)]",
                )}
              >
                {shown && broken !== shown ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shown}
                    alt=""
                    onError={() => setBroken(shown)}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-6 text-center text-[12.5px] text-[var(--i-muted)]">
                    <ImageSquare size={28} className="text-[var(--i-faint)]" />
                    {shown ? "Couldn't load an image from that link." : "Drop an image here, or upload one below."}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`${id}-src`} className="block text-[12.5px] font-medium text-[var(--i-muted)]">
                  Image
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => pick(event.target.files?.[0])}
                  />
                  {upload ? (
                    <button
                      ref={uploadButton}
                      type="button"
                      disabled={busy}
                      onClick={() => fileInput.current?.click()}
                      className={buttonClass("secondary")}
                    >
                      <UploadSimple size={14} />
                      {picked || src ? "Replace" : "Upload"}
                    </button>
                  ) : null}
                  {picked ? (
                    <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)] px-3 text-[13px]">
                      <span className="min-w-0 flex-1 truncate">{picked.file.name}</span>
                      <span className="shrink-0 text-[12px] text-[var(--i-faint)]">{formatSize(picked.file.size)}</span>
                      <button
                        type="button"
                        aria-label="Remove this file"
                        disabled={busy}
                        onClick={unpick}
                        className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <input
                      id={`${id}-src`}
                      value={src}
                      onChange={(event) => setSrc(event.target.value)}
                      placeholder="or paste a link: https://… or /blog/uploads/…"
                      spellCheck={false}
                      className={cn(field, "h-8 min-w-0 flex-1 py-0")}
                    />
                  )}
                </div>
                {picked ? (
                  <p className="text-[12px] text-[var(--i-faint)]">Uploads when you save.</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={`${id}-alt`} className="text-[12.5px] font-medium text-[var(--i-muted)]">
                    Alt text <span className="font-normal text-[var(--i-faint)]">· needed to publish</span>
                  </label>
                  <span
                    className={cn(
                      "text-[12px] tabular-nums",
                      alt.length > ALT_LIMIT ? "text-amber-600 dark:text-amber-400" : "text-[var(--i-faint)]",
                    )}
                  >
                    {alt.length}/{ALT_LIMIT}
                  </span>
                </div>
                <textarea
                  ref={altInput}
                  id={`${id}-alt`}
                  rows={2}
                  value={alt}
                  onChange={(event) => setAlt(event.target.value.replace(/\s*\n\s*/g, " "))}
                  onKeyDown={enterSaves}
                  placeholder="What the image shows, e.g. Bar chart of AI Overview citations by month"
                  className={cn(field, "max-h-40 min-h-[60px] resize-none [field-sizing:content]")}
                />
                <p className="text-[12px] leading-relaxed text-[var(--i-faint)]">
                  {alt.length > ALT_LIMIT
                    ? `Aim for under ${ALT_LIMIT} characters; some screen readers cut longer text short.`
                    : "For people who can't see it. Screen readers and Google read this."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`${id}-caption`} className="block text-[12.5px] font-medium text-[var(--i-muted)]">
                  Caption <span className="font-normal text-[var(--i-faint)]">· optional</span>
                </label>
                <textarea
                  id={`${id}-caption`}
                  rows={2}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value.replace(/\s*\n\s*/g, " "))}
                  onKeyDown={enterSaves}
                  placeholder="Shown under the image on the blog"
                  className={cn(field, "max-h-40 min-h-[60px] resize-none [field-sizing:content]")}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
              <Dialog.Close asChild>
                <button type="button" className={buttonClass("secondary")}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" disabled={!canSave} className={buttonClass("primary")}>
                {busy ? "Uploading…" : editing ? "Save" : "Add image"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function oneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
