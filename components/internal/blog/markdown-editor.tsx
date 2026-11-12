"use client";

import "@mdxeditor/editor/style.css";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import { useEffect, useState, type RefObject } from "react";
import { ImageDialog } from "./image-dialog";

/** Code block languages the editor offers (and the ones posts already use). */
const LANGUAGES: Record<string, string> = {
  text: "Plain text",
  txt: "Plain text",
  "": "Plain text",
  bash: "Bash",
  sh: "Shell",
  console: "Console",
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  python: "Python",
  py: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  markdown: "Markdown",
  md: "Markdown",
  diff: "Diff",
  dockerfile: "Dockerfile",
  gitattributes: "Plain text",
};

/** Plainer wording for the editor's own labels and tooltips. */
const LABELS: Record<string, string> = {
  "createLink.url": "Link",
  "createLink.urlPlaceholder": "Paste a link",
  "createLink.text": "Text",
  "createLink.title": "Hover text (optional)",
  "createLink.saveTooltip": "Save link",
  "toolbar.image": "Insert image",
  "toolbar.table": "Insert table",
  "toolbar.codeBlock": "Insert code block",
  "toolbar.thematicBreak": "Insert divider",
  "toolbar.source": "Markdown",
  "imageEditor.editImage": "Edit image, alt text and caption",
};

function translation(key: string, defaultValue: string, interpolations: Record<string, unknown> = {}) {
  let value = LABELS[key] ?? defaultValue;
  for (const [name, replacement] of Object.entries(interpolations)) {
    value = value.replaceAll(`{{${name}}}`, String(replacement));
  }
  return value;
}

/**
 * True while the dashboard is in dark mode: the theme provider puts a "dark"
 * class on <html>, which is also what the dashboard's own colors follow.
 */
function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/**
 * The writing area: a Notion-like editor that reads and writes Markdown.
 * Pasting from Notion or Google Docs keeps headings, lists and links;
 * pasted or dropped images go through `uploadImage`. "Source" shows the
 * raw Markdown for anyone who prefers it.
 */
export default function MarkdownEditor({
  markdown,
  onChange,
  uploadImage,
  editorRef,
  onError,
}: {
  markdown: string;
  onChange: (markdown: string) => void;
  uploadImage: (file: File) => Promise<string>;
  editorRef: RefObject<MDXEditorMethods | null>;
  onError: (message: string) => void;
}) {
  // The editor's own dark palette. The class list is copied onto the
  // container its popups (image and link dialogs, menus) render in, on
  // <body> outside the dashboard, so .internal-pop brings the dashboard's
  // colors there too (internal.css styles them).
  const dark = useDarkMode();
  return (
    <MDXEditor
      ref={editorRef}
      markdown={markdown}
      onChange={(value, initialNormalize) => {
        if (!initialNormalize) onChange(value);
      }}
      onError={({ error }) => onError(error)}
      placeholder="Start writing, or paste from Notion or Google Docs…"
      translation={translation}
      className={dark ? "blog-editor internal-pop dark-theme" : "blog-editor internal-pop"}
      contentEditableClassName="blog-editor-content prose prose-neutral max-w-none dark:prose-invert"
      plugins={[
        toolbarPlugin({
          toolbarContents: () => (
            <DiffSourceToggleWrapper options={["rich-text", "source"]}>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles options={["Bold", "Italic"]} />
              <CodeToggle />
              <Separator />
              <ListsToggle options={["bullet", "number"]} />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertCodeBlock />
              <InsertThematicBreak />
            </DiffSourceToggleWrapper>
          ),
        }),
        // Posts use H2 and H3 (the title is the page's H1). Only limits the
        // menu and shortcuts; a post with other levels still loads as it is.
        headingsPlugin({ allowedHeadingLevels: [2, 3] }),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin({ imageUploadHandler: uploadImage, disableImageResize: true, ImageDialog }),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
        codeMirrorPlugin({ codeBlockLanguages: LANGUAGES }),
        diffSourcePlugin({ viewMode: "rich-text" }),
        markdownShortcutPlugin(),
      ]}
    />
  );
}
