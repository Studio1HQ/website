import type { Metadata } from "next";
import { connection } from "next/server";
import Logo from "@/components/ui/svgs/logo";

export const metadata: Metadata = { title: "Studio1 Connect privacy policy" };

/**
 * The privacy policy for Studio1 Connect, the team's browser extension
 * (extension/connect), at www.studio1hq.com/internal/extension/privacy: the
 * link its Chrome Web Store listing gives. Kept apart from the site's
 * /privacy, which covers clients and visitors; this covers the internal tool
 * only. The one /internal page the public site serves (proxy.ts), so anyone
 * can read it without signing in; never indexed (next.config.ts headers),
 * linked from nowhere on the site. On the dashboard host the same path stays
 * behind sign-in like every other page there.
 */
export default async function ConnectPrivacyPage() {
  // Rendered per request, so a dashboard-host visit gets its CSP nonce on the scripts.
  await connection();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-10 flex items-center gap-3">
        <Logo className="size-9" />
        <div>
          <p className="text-[17px] font-medium leading-tight">Studio1 Connect</p>
          <p className="text-sm text-[var(--i-muted)]">Browser extension for the Studio1 team</p>
        </div>
      </div>

      <h1 className="text-3xl font-medium tracking-tight">Privacy policy</h1>
      <p className="mt-2 border-b border-[var(--i-line)] pb-6 text-sm text-[var(--i-muted)]">Last updated 26 November 2026</p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-medium [&_li]:mt-1.5 [&_p]:text-[var(--i-muted)] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-[var(--i-muted)]">
        <section>
          <p>
            Studio1 Connect is a browser extension made by STUDI01HQ PRIVATE LIMITED (&ldquo;Studio1&rdquo;) for its own team. It shows a team
            member&apos;s tasks, day clock and notifications from Studio1&apos;s team dashboard (dashboard.studio1hq.com) in the browser&apos;s side panel.
            Only people with access to that dashboard can sign in. This policy covers the extension only.
          </p>
        </section>

        <section>
          <h2>What it handles</h2>
          <ul>
            <li>Your work email address, to send you a sign-in code, and the code you enter.</li>
            <li>The sign-in session the dashboard returns once the code is right.</li>
            <li>While you are signed in: your name, role, profile photo, tasks, day clock and notifications, loaded from the dashboard.</li>
          </ul>
        </section>

        <section>
          <h2>Where it is kept</h2>
          <p>
            Your email address and the sign-in session are stored only in your browser&apos;s extension storage, until you sign out or the session
            ends (after 7 days). Everything else is loaded from the dashboard when the panel opens and is not stored by the extension.
          </p>
        </section>

        <section>
          <h2>Who it talks to</h2>
          <p>
            Only dashboard.studio1hq.com. The extension does not read or change the other websites you visit. On the dashboard&apos;s own pages it
            marks that Connect is installed and who is signed in, so the dashboard can show it.
          </p>
        </section>

        <section>
          <h2>What you change</h2>
          <p>
            Starting or ending your day, adding a task, or changing a task&apos;s progress is saved on the dashboard, the same as doing it there.
          </p>
        </section>

        <section>
          <h2>What it does not do</h2>
          <ul>
            <li>No analytics, tracking or advertising.</li>
            <li>It does not sell, share or transfer your information to anyone.</li>
            <li>It does not use your information for anything other than showing and updating your own work on the dashboard.</li>
          </ul>
          <p className="mt-3">
            Its use of information follows the{" "}
            <a
              className="underline underline-offset-4"
              href="https://developer.chrome.com/docs/webstore/program-policies/user-data-faq"
              target="_blank"
              rel="noreferrer"
            >
              Chrome Web Store User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2>Removing your information</h2>
          <p>
            Sign out from the extension&apos;s Profile section, or remove the extension from your browser, and everything it stored is gone. What
            you saved on the dashboard stays there, under Studio1&apos;s own policies for its team.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about this policy:{" "}
            <a className="underline underline-offset-4" href="mailto:contact@studio1hq.com">
              contact@studio1hq.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
