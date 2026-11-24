import * as L from "lucide-react";
import { ConnectMark } from "@/components/internal/connections/brand-logos";
import { buttonClass } from "@/components/internal/ui";

/**
 * Studio1 Connect on the Connections page, laid out like the integrations
 * below it: its mark, what it does, and Download. The extension signs in by
 * itself with an emailed code, like the dashboard; there's nothing to set
 * up here.
 */
export function ConnectApp() {
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
          </div>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-[var(--i-muted)]">
            Your tasks, day clock and notifications in the browser toolbar, without opening the dashboard. Sign in with your
            Studio1 email and the code we send, just like here. Works in Chrome, Edge, Brave and Arc.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a href="/downloads/studio1-connect.zip" download className={buttonClass("primary")}>
            <L.Download strokeWidth={2} className="size-4" /> Download
          </a>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-[var(--i-line-strong)] px-6 py-8 text-center">
        <p className="mx-auto max-w-lg text-[13px] leading-relaxed text-[var(--i-muted)]">
          Download Connect and add it to your browser (Extensions → Developer mode → Load unpacked, then pick the unzipped
          folder). Open it from the toolbar and sign in with your Studio1 email.
        </p>
      </div>
    </div>
  );
}
