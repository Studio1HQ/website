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

  #nc-root.studio1-cms-wide .SplitPane > .Pane1 {
    width: min(58%, 980px) !important;
  }

  #nc-root.studio1-cms-wide .SplitPane > .Pane2 {
    min-width: 520px !important;
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

    #nc-root [class*="Preview"],
    #nc-root [class*="preview"],
    #nc-root [class*="PreviewPane"],
    #nc-root iframe#preview-pane {
      display: none !important;
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

    #nc-root .SplitPane > .Pane2,
    #nc-root .SplitPane > .Resizer {
      display: none !important;
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

  #nc-root.studio1-cms-phone [class*="Preview"],
  #nc-root.studio1-cms-phone [class*="preview"],
  #nc-root.studio1-cms-phone [class*="PreviewPane"],
  #nc-root.studio1-cms-phone iframe#preview-pane,
  #nc-root.studio1-cms-phone .SplitPane > .Pane2,
  #nc-root.studio1-cms-phone .SplitPane > .Resizer {
    display: none !important;
  }

  #nc-root.studio1-cms-phone [class*="EditorContainer"],
  #nc-root.studio1-cms-phone .SplitPane,
  #nc-root.studio1-cms-phone .SplitPane > .Pane1,
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

export default function AdminPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: adminCss }} />
      <Script id="decap-base-path" strategy="beforeInteractive">
        {`document.head.insertAdjacentHTML("afterbegin", '<base href="/admin/">');`}
      </Script>
      <Script
        src="/admin/notion-paste-helper.js?v=2026-10-02-cms-polish"
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
    </>
  );
}
