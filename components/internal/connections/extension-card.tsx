"use client";

import { useSyncExternalStore } from "react";
import * as L from "lucide-react";
import { ConnectMark } from "@/components/internal/connections/brand-logos";
import { buttonClass } from "@/components/internal/ui";
import { cn } from "@/lib/utils";

type ConnectState = "missing" | "installed" | "signed-in";

/*
 * Connect marks the dashboard's pages itself (extension/connect/detect.js):
 * <html data-studio1-connect="installed" | "signed-in">, plus the email it's
 * signed in with. Read here, and followed as it changes (signing in or out
 * in the side panel updates this page at once).
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-studio1-connect", "data-studio1-connect-email"],
  });
  return () => observer.disconnect();
}

function readState(): string {
  const root = document.documentElement;
  return `${root.dataset.studio1Connect ?? "missing"}|${root.dataset.studio1ConnectEmail ?? ""}`;
}

/**
 * Studio1 Connect on the Connections page, laid out like the integrations
 * below it. Once Connect is signed in on this browser it says so, and the
 * install steps go; signed out, it says where to sign in.
 */
export function ConnectApp() {
  // Server render and first paint: "missing"; the extension's mark arrives just after.
  const [raw, email] = useSyncExternalStore(subscribe, readState, () => "missing|").split("|");
  const state: ConnectState = raw === "signed-in" || raw === "installed" ? raw : "missing";

  return (
    <div>
      <div className="flex flex-col gap-4 py-2 sm:flex-row sm:items-start">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
          <ConnectMark animated className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-medium">Connect</h3>
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11.5px] font-medium text-[var(--i-muted)] dark:bg-white/[0.08]">
              Browser extension
            </span>
            {state === "signed-in" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11.5px] font-medium text-emerald-700 dark:text-emerald-300">
                <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            ) : state === "installed" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11.5px] font-medium text-amber-700 dark:text-amber-300">
                <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                Installed · not signed in
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-[var(--i-muted)]">
            {state === "signed-in" ? (
              <>
                Your tasks, day clock and notifications are in this browser&apos;s toolbar. Signed in as{" "}
                <span className="font-medium text-[var(--i-ink-2)]">{email || "you"}</span>.
              </>
            ) : state === "installed" ? (
              <>Connect is installed in this browser. Open it from the toolbar and sign in with your Studio1 email.</>
            ) : (
              <>
                Your tasks, day clock and notifications in the browser toolbar, without opening the dashboard. Sign in with your
                Studio1 email and the code we send, just like here. Works in Chrome, Edge, Brave and Arc.
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/downloads/studio1-connect.zip"
            download
            className={cn(buttonClass(state === "missing" ? "primary" : "ghost"), state !== "missing" && "text-[var(--i-muted)]")}
          >
            <L.Download strokeWidth={2} className="size-4" /> {state === "missing" ? "Download" : "Download again"}
          </a>
        </div>
      </div>

      {/* The install steps, only until Connect is in this browser. */}
      {state === "missing" ? (
        <ol className="mt-4 grid gap-3 rounded-2xl border border-dashed border-[var(--i-line-strong)] p-5 text-[13px] sm:grid-cols-3">
          {[
            ["Download", "Get the zip above and unzip it."],
            ["Add to your browser", "Extensions → turn on Developer mode → Load unpacked → pick the folder."],
            ["Sign in", "Click Connect in the toolbar and sign in with your Studio1 email."],
          ].map(([title, body], index) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--i-sunken)] text-[12px] font-medium tabular-nums text-[var(--i-muted)] ring-1 ring-[var(--i-line)]">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block leading-relaxed text-[var(--i-muted)]">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
