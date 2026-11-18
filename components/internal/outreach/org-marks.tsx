import { Warning } from "@phosphor-icons/react/dist/ssr";
import { ORG_PRIORITIES, type Org } from "@/lib/internal/outreach/schema";
import { Muted, Pill } from "@/components/internal/community/ui";
import { SiteLogo } from "@/components/internal/site-logo";

/**
 * Small marks an organisation carries on the Outreach list, board and page:
 * its logo, its priority and a clash with a client.
 */

export function OrgLogo({ org, size = 24 }: { org: Pick<Org, "id" | "name" | "website">; size?: number }) {
  return <SiteLogo path={`/outreach/${org.id}/logo`} name={org.name} website={org.website} size={size} />;
}

export function PriorityPill({ priority }: { priority: Org["priority"] }) {
  const option = ORG_PRIORITIES.find((item) => item.value === priority);
  if (!option) return <Muted>—</Muted>;
  return <Pill tone={option.tone}>{option.label}</Pill>;
}

/** Close to a client: check with them before anyone reaches out. */
export function ConflictMark({ conflict }: { conflict: string }) {
  if (!conflict) return null;
  return (
    <span
      title="Close to a Studio1 client: check before reaching out"
      className="inline-flex max-w-full items-center gap-1 whitespace-nowrap text-[12px] text-amber-700 dark:text-amber-300"
    >
      <Warning size={12} weight="bold" className="shrink-0" aria-hidden />
      <span className="truncate">{conflict}</span>
    </span>
  );
}
