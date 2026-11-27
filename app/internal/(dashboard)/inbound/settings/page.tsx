import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/internal/ui";
import { SettingsForm } from "@/components/internal/inbound/settings-form";
import { requireInbound } from "@/lib/internal/inbound/access";
import { getAgentSettings } from "@/lib/internal/inbound/data";
import { canSeeMoney } from "@/lib/internal/session";

export const metadata: Metadata = { title: "Inbound settings" };

/** What the agent and the sorter may do on their own. Founders only. */
export default async function InboundSettingsPage() {
  const staff = await requireInbound();
  if (!canSeeMoney(staff)) redirect("/inbound");
  const settings = await getAgentSettings();
  return (
    <>
      <PageHeader
        title="Inbound settings"
        description="What the agent does by itself, and the rules it follows. Only the founders see this page."
      />
      <Card className="max-w-3xl px-5 py-2">
        <SettingsForm initial={settings} />
      </Card>
    </>
  );
}
