import Script from "next/script";
import type { Viewport } from "next";

export const metadata = {
  title: "Studio1 CMS",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const adminCss = `
  :root {
    --studio1-cms-bg: #f5f3ef;
    --studio1-cms-panel: rgba(255, 255, 255, 0.94);
    --studio1-cms-border: rgba(32, 32, 32, 0.12);
    --studio1-cms-text: #171717;
    --studio1-cms-muted: #69665f;
    --studio1-cms-accent: #111111;
    --studio1-cms-teal: #17a8b8;
  }

  html,
  body {
    min-height: 100%;
    overflow-x: auto;
    background:
      radial-gradient(circle at top left, rgba(23, 168, 184, 0.10), transparent 34rem),
      linear-gradient(180deg, #fbfaf7 0%, var(--studio1-cms-bg) 100%) !important;
    color: var(--studio1-cms-text);
  }

  #nc-root {
    min-height: 100vh;
  }

  #nc-root [class*="AppMainContainer"] {
    max-width: min(1760px, calc(100vw - 48px)) !important;
    margin: 0 auto !important;
  }

  #nc-root [class*="EditorContainer"],
  #nc-root [class*="CollectionContainer"],
  #nc-root [class*="WorkflowContainer"] {
    border-radius: 14px !important;
    border: 1px solid var(--studio1-cms-border) !important;
    background: var(--studio1-cms-panel) !important;
    box-shadow: 0 24px 80px -56px rgba(0, 0, 0, 0.45) !important;
  }

  #nc-root [class*="ControlPaneContainer"] {
    background: transparent !important;
    padding: clamp(16px, 2vw, 28px) !important;
  }

  #nc-root [class*="PreviewPaneContainer"] {
    background: #fffdf9 !important;
  }

  #nc-root [class*="ControlContainer"] {
    margin-bottom: 22px !important;
  }

  #nc-root [class*="ControlContainer"] p,
  #nc-root [class*="ControlContainer"] [class*="Hint"] {
    color: var(--studio1-cms-muted) !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
  }

  #nc-root label,
  #nc-root [class*="FieldLabel"] {
    border-radius: 5px !important;
    background: #ebe8e1 !important;
    color: #5e5b54 !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;
    text-transform: uppercase !important;
  }

  #nc-root input,
  #nc-root textarea,
  #nc-root [role="textbox"],
  #nc-root [contenteditable="true"] {
    border-color: rgba(28, 28, 28, 0.16) !important;
    border-radius: 8px !important;
    background: #fffdf9 !important;
    color: var(--studio1-cms-text) !important;
    box-shadow: none !important;
  }

  #nc-root input:focus,
  #nc-root textarea:focus,
  #nc-root [role="textbox"]:focus,
  #nc-root [contenteditable="true"]:focus {
    border-color: var(--studio1-cms-teal) !important;
    box-shadow: 0 0 0 3px rgba(23, 168, 184, 0.16) !important;
    outline: none !important;
  }

  #nc-root textarea[id^="description-field"],
  #nc-root textarea[id^="tldrSummary-field"] {
    min-height: 4.75rem !important;
    max-height: 12rem !important;
    resize: vertical !important;
  }

  #nc-root button {
    border-radius: 8px !important;
  }

  #nc-root button:not(:disabled) {
    transition:
      transform 140ms ease,
      box-shadow 140ms ease,
      border-color 140ms ease,
      background-color 140ms ease !important;
  }

  #nc-root button:not(:disabled):hover {
    transform: translateY(-1px);
  }

  #nc-root [class*="FileWidgetButton"],
  #nc-root [class*="AddButton"],
  #nc-root [class*="ToolbarButton"] {
    border-color: rgba(28, 28, 28, 0.14) !important;
  }

  #nc-root [class*="TopBar"],
  #nc-root header {
    background: rgba(255, 255, 255, 0.92) !important;
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--studio1-cms-border) !important;
  }

  #nc-root iframe#preview-pane {
    background: #fffdf9 !important;
  }

  #nc-root [class*="RawEditorContainer"],
  #nc-root [class*="MarkdownControl"] {
    border-radius: 10px !important;
    overflow: hidden !important;
  }

  #nc-root [class*="EditorControlBar"],
  #nc-root [class*="ToolbarContainer"] {
    background: #f4f1eb !important;
  }

  #nc-root button[title="Sync scrolling"] {
    display: none !important;
  }

  #nc-root .studio1-cms-sync-action {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 0.75rem !important;
    margin: 0 0 1rem !important;
    padding: 0.85rem 1rem !important;
    border: 1px solid rgba(23, 168, 184, 0.28) !important;
    border-radius: 10px !important;
    background: rgba(23, 168, 184, 0.08) !important;
    color: var(--studio1-cms-text) !important;
  }

  #nc-root .studio1-cms-sync-action p {
    margin: 0 !important;
    color: var(--studio1-cms-muted) !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
  }

  #nc-root .studio1-cms-sync-action strong {
    display: block !important;
    margin-bottom: 0.15rem !important;
    color: var(--studio1-cms-text) !important;
    font-size: 13px !important;
  }

  #nc-root .studio1-cms-sync-action button {
    flex: 0 0 auto !important;
    border: 1px solid rgba(23, 168, 184, 0.42) !important;
    background: #ffffff !important;
    color: #0b6f7d !important;
    padding: 0.55rem 0.75rem !important;
    font-size: 13px !important;
    font-weight: 650 !important;
  }

  #nc-root .studio1-cms-card-with-banner {
    min-height: 15rem !important;
    overflow: hidden !important;
  }

  #nc-root .studio1-cms-card-banner {
    display: block !important;
    width: calc(100% + 2px) !important;
    height: 8.75rem !important;
    margin: -1px -1px 1rem !important;
    border-radius: 10px 10px 0 0 !important;
    background: #050505 !important;
    object-fit: contain !important;
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.08) !important;
  }

  #nc-root .studio1-cms-card-no-banner {
    min-height: 11rem !important;
  }

  #nc-root .studio1-cms-blog-search {
    margin: 1rem 0 1.25rem !important;
    padding: 1rem !important;
    border: 1px solid var(--studio1-cms-border) !important;
    border-radius: 12px !important;
    background: rgba(255, 255, 255, 0.82) !important;
    box-shadow: 0 14px 44px -34px rgba(0, 0, 0, 0.35) !important;
  }

  #nc-root .studio1-cms-blog-search-label {
    display: inline-flex !important;
    width: auto !important;
    margin-bottom: 0.65rem !important;
    padding: 0.25rem 0.45rem !important;
  }

  #nc-root .studio1-cms-blog-search-row {
    display: flex !important;
    align-items: center !important;
    gap: 0.8rem !important;
  }

  #nc-root .studio1-cms-blog-search-input {
    width: min(34rem, 100%) !important;
    min-height: 2.75rem !important;
    padding: 0 0.9rem !important;
  }

  #nc-root .studio1-cms-blog-search-status {
    color: var(--studio1-cms-muted) !important;
    font-size: 13px !important;
    white-space: nowrap !important;
  }

  @media (max-width: 700px) {
    #nc-root .studio1-cms-blog-search-row {
      align-items: stretch !important;
      flex-direction: column !important;
      gap: 0.5rem !important;
    }

    #nc-root .studio1-cms-blog-search-status {
      white-space: normal !important;
    }
  }

  #nc-root.studio1-cms-wide .SplitPane > .Pane1 {
    position: static !important;
    width: min(58%, 980px) !important;
    min-width: min(52vw, 760px) !important;
    max-width: 980px !important;
    flex: 0 0 min(58%, 980px) !important;
    overflow: auto !important;
  }

  #nc-root.studio1-cms-wide .SplitPane {
    display: flex !important;
    flex-direction: row !important;
    align-items: stretch !important;
    overflow: hidden !important;
  }

  #nc-root.studio1-cms-wide .SplitPane > .Pane2 {
    position: static !important;
    display: block !important;
    width: auto !important;
    min-width: 520px !important;
    max-width: none !important;
    flex: 1 1 0 !important;
    overflow: auto !important;
  }

  #nc-root.studio1-cms-wide .SplitPane > .Resizer {
    display: none !important;
  }

  #nc-root.studio1-cms-wide iframe#preview-pane {
    display: block !important;
    width: 100% !important;
    min-height: 100% !important;
  }

  #nc-root.studio1-cms-preview-layout .SplitPane {
    display: flex !important;
    flex-direction: row !important;
    align-items: stretch !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow: hidden !important;
  }

  #nc-root.studio1-cms-preview-layout .SplitPane > .Pane1,
  #nc-root.studio1-cms-preview-layout .SplitPane > .Pane2 {
    position: static !important;
    display: block !important;
    width: 50% !important;
    min-width: 0 !important;
    max-width: 50% !important;
    flex: 0 0 50% !important;
    overflow: auto !important;
  }

  #nc-root.studio1-cms-preview-layout .SplitPane > .Pane2 {
    border-left: 1px solid var(--studio1-cms-border) !important;
    background: #fffdf9 !important;
  }

  #nc-root.studio1-cms-preview-layout [class*="ControlPaneContainer"] {
    max-width: none !important;
  }

  #nc-root.studio1-cms-preview-layout [class*="PreviewPaneContainer"] {
    min-height: 100% !important;
    background: #fffdf9 !important;
  }

  #nc-root.studio1-cms-preview-layout iframe#preview-pane {
    display: block !important;
    width: 100% !important;
    min-height: 100% !important;
    border: 0 !important;
    background: #fffdf9 !important;
  }

  @media (min-width: 781px) and (max-width: 1120px) {
    #nc-root.studio1-cms-preview-layout [class*="ControlPaneContainer"] {
      padding: 16px !important;
    }

    #nc-root.studio1-cms-preview-layout .studio1-cms-blog-search {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }

  input,
  textarea,
  [contenteditable="true"] {
    font-size: 16px !important;
  }

  textarea {
    min-height: 18rem;
  }

  @media (max-width: 780px) {
    html,
    body,
    #nc-root,
    #nc-root > div {
      width: 100% !important;
      max-width: 100vw !important;
      min-width: 0 !important;
      overflow-x: hidden !important;
    }

    body {
      min-width: 0 !important;
    }

    #nc-root,
    #nc-root * {
      box-sizing: border-box !important;
    }

    #nc-root [class*="EditorContainer"] {
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100vw !important;
      overflow: visible !important;
    }

    #nc-root .SplitPane {
      display: block !important;
      width: 100% !important;
      max-width: 100vw !important;
      overflow: visible !important;
    }

    #nc-root .SplitPane > .Pane1 {
      position: static !important;
      width: 100% !important;
      max-width: 100vw !important;
      min-width: 0 !important;
      flex: none !important;
    }

    #nc-root .SplitPane > .Pane2 {
      position: static !important;
      display: block !important;
      width: 100% !important;
      max-width: 100vw !important;
      min-width: 0 !important;
      flex: none !important;
      margin-top: 1rem !important;
    }

    #nc-root .SplitPane > .Resizer {
      display: none !important;
    }

    #nc-root [class*="PreviewPaneContainer"] {
      min-height: 72vh !important;
      border-top: 1px solid var(--studio1-cms-border) !important;
    }

    #nc-root iframe#preview-pane {
      display: block !important;
      width: 100% !important;
      min-height: 72vh !important;
    }

    [class*="AppMain"],
    [class*="Editor"],
    [class*="Collection"],
    [class*="ControlPane"],
    [class*="Pane"],
    [class*="Container"],
    [class*="Workflow"],
    [class*="BackCollection"],
    [class*="EditorControl"] {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100vw !important;
    }

    [class*="Toolbar"],
    [class*="ControlBar"],
    [class*="TopBar"],
    header {
      flex-wrap: wrap !important;
      gap: 0.5rem !important;
    }

    form,
    label,
    input,
    textarea,
    select,
    [contenteditable="true"] {
      width: 100% !important;
      max-width: 100% !important;
    }

    [class*="Sidebar"],
    [class*="Drawer"] {
      max-width: min(92vw, 24rem) !important;
    }

    textarea {
      min-height: 22rem;
    }
  }

  #nc-root.studio1-cms-phone,
  #nc-root.studio1-cms-phone > div {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
  }

  #nc-root.studio1-cms-phone .SplitPane > .Resizer {
    display: none !important;
  }

  #nc-root.studio1-cms-phone [class*="EditorContainer"],
  #nc-root.studio1-cms-phone .SplitPane,
  #nc-root.studio1-cms-phone .SplitPane > .Pane1,
  #nc-root.studio1-cms-phone .SplitPane > .Pane2,
  #nc-root.studio1-cms-phone [class*="AppMainContainer"] {
    position: static !important;
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    flex: none !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    overflow: visible !important;
  }

  #nc-root.studio1-cms-phone .SplitPane > .Pane2 {
    display: block !important;
    margin-top: 1rem !important;
  }

  #nc-root.studio1-cms-phone [class*="PreviewPaneContainer"],
  #nc-root.studio1-cms-phone iframe#preview-pane {
    display: block !important;
    width: 100% !important;
    max-width: 100vw !important;
    min-height: 72vh !important;
  }

  @media (max-width: 520px) {
    #nc-root [class*="Toolbar"],
    #nc-root [class*="ControlBar"],
    #nc-root [class*="TopBar"],
    #nc-root header {
      align-items: center !important;
    }

    #nc-root button {
      max-width: 100% !important;
      white-space: normal !important;
    }

    #nc-root main,
    #nc-root section,
    #nc-root article {
      width: 100% !important;
      max-width: 100vw !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }
`;

const cmsAssetVersion = "2026-10-03-tldr-fields-v4";

export default function AdminPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: adminCss }} />
      <Script id="decap-base-path" strategy="beforeInteractive">
        {`
          document.head.insertAdjacentHTML(
            "afterbegin",
            '<base href="/admin/"><link href="/admin/config.yml?v=${cmsAssetVersion}" type="text/yaml" rel="cms-config-url">'
          );
        `}
      </Script>
      <Script
        src={`/admin/notion-paste-helper.js?v=${cmsAssetVersion}`}
        strategy="beforeInteractive"
      />
      <Script
        src="https://identity.netlify.com/v1/netlify-identity-widget.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://unpkg.com/decap-cms@^3.8.0/dist/decap-cms.js"
        strategy="afterInteractive"
      />
      <Script
        src={`/admin/blog-preview.js?v=${cmsAssetVersion}`}
        strategy="afterInteractive"
      />
    </>
  );
}
