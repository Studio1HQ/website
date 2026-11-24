import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  GitHubLogo,
  GmailLogo,
  GoogleCalendarLogo,
  NotionLogo,
  SlackLogo,
} from "@/components/internal/connections/brand-logos";
import { ConnectApp } from "@/components/internal/connections/extension-card";
import { PageHeader } from "@/components/internal/ui";
import { requireMember } from "@/lib/internal/session";

export const metadata: Metadata = { title: "Connections" };

/** Tools to connect next: listed so people know what's coming, not clickable yet. */
const INTEGRATIONS: { name: string; body: string; logo: ReactNode }[] = [
  { name: "Google Calendar", body: "Keep your calls and events in step with Calls.", logo: <GoogleCalendarLogo className="size-5" /> },
  { name: "Gmail", body: "Turn an email into a task or an outreach follow-up.", logo: <GmailLogo className="size-5" /> },
  { name: "Slack", body: "Get notifications and update tasks from a DM.", logo: <SlackLogo className="size-5" /> },
  { name: "GitHub", body: "Link pull requests to tasks and client deliverables.", logo: <GitHubLogo className="size-5" /> },
  { name: "Notion", body: "Bring docs and briefs into client work.", logo: <NotionLogo className="size-5" /> },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 first-of-type:mt-2">
      <h2 className="mb-4 text-[16px] font-medium tracking-[-0.01em]">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Connections: the Studio1 Connect browser extension and the tools you work
 * in, linked to your own dashboard account. Open to anyone with a way into
 * the dashboard; each person only ever sees and changes their own.
 */
export default async function ConnectionsPage() {
  await requireMember();

  return (
    <>
      <PageHeader
        title="Connections"
        description="Link your browser and the tools you work in to your dashboard account. Everything here is yours alone."
      />

      <Section title="Studio1 apps">
        <ConnectApp />
      </Section>

      <Section title="Integrations">
        <ul className="grid gap-x-10 gap-y-2 md:grid-cols-2">
          {INTEGRATIONS.map((integration) => (
            <li key={integration.name} className="flex items-start gap-4 py-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-[var(--i-ink)] dark:bg-white/[0.06]">
                {integration.logo}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{integration.name}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-[var(--i-muted)]">{integration.body}</span>
              </span>
              <span className="shrink-0 rounded-full bg-black/[0.05] px-3.5 py-2 text-[12.5px] font-medium text-[var(--i-muted)] dark:bg-white/[0.07]">
                Coming soon
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
