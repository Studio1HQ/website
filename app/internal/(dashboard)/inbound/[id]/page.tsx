import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowSquareOut } from "@/components/internal/icons";
import { SiteLogo } from "@/components/internal/site-logo";
import { ConvertButton } from "@/components/internal/outreach/convert-button";
import { LeadActions } from "@/components/internal/inbound/lead-controls";
import {
  LeadFiles,
  LeadNext,
  LeadProfile,
  LeadTimeline,
} from "@/components/internal/inbound/lead-panels";
import { ExternalLink, Notice, buttonClass } from "@/components/internal/ui";
import { requireInbound } from "@/lib/internal/inbound/access";
import { getInboundLead } from "@/lib/internal/inbound/data";
import {
  httpUrl,
  sourceLabel,
  stageLabel,
} from "@/lib/internal/inbound/wording";
import { getClientById } from "@/lib/internal/outreach/client-link";
import { canSeeMoney, canSeeOutreach } from "@/lib/internal/session";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // The title is data too: check who's asking before reading the record.
  const [, { id }] = await Promise.all([requireInbound(), params]);
  const lead = await getInboundLead(id.toLowerCase());
  return { title: lead && lead !== "error" ? lead.org.name : "Inbound" };
}

export default async function InboundLeadPage({ params }: Props) {
  const [staff, { id }] = await Promise.all([requireInbound(), params]);
  const lead = await getInboundLead(id.toLowerCase());
  if (lead === "error")
    return (
      <Notice tone="warning">
        Couldn&apos;t load this lead. Reload in a minute.
      </Notice>
    );
  if (!lead) notFound();

  const { org, contacts, events, files } = lead;
  const isFounder = canSeeMoney(staff);
  const client = org.client_id ? await getClientById(org.client_id) : null;
  const website = httpUrl(org.website);
  const primary = contacts.find((contact) => contact.is_primary) ?? contacts[0];
  // The hand-off is Outreach's own action, unchanged: it needs both areas.
  const canConvert =
    org.stage === "won" &&
    !org.client_id &&
    staff.clients === "manager" &&
    canSeeOutreach(staff);

  const facts = [
    stageLabel(org.stage),
    sourceLabel(org.source),
    primary ? [primary.name, primary.email].filter(Boolean).join(" · ") : "",
  ].filter(Boolean);

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:h-[clamp(32rem,calc(100dvh-7.5rem),60rem)]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Link
            href="/inbound"
            className="mb-1.5 inline-flex items-center gap-1 text-[13px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
          >
            <ArrowLeft size={13} /> Inbound
          </Link>
          <h1 className="flex min-w-0 items-center gap-3 text-[22px] font-medium leading-tight tracking-[-0.02em] md:text-[26px]">
            <SiteLogo
              path={`/inbound/${org.id}/logo`}
              name={org.name}
              website={website}
              size={30}
            />
            <span className="min-w-0 truncate">{org.name}</span>
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--i-muted)]">
            {facts.map((fact, index) => (
              <span key={index} className="inline-flex items-center gap-2">
                {index ? <span aria-hidden>·</span> : null}
                <span
                  className={
                    index === 0 ? "font-medium text-[var(--i-ink)]" : ""
                  }
                >
                  {fact}
                </span>
              </span>
            ))}
            {website ? (
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>·</span>
                <ExternalLink href={website} className="text-[13px]" />
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {client ? (
            <Link
              href={`/clients/${client.slug}`}
              className={buttonClass("secondary", "sm")}
            >
              <ArrowSquareOut size={14} /> Open the client
            </Link>
          ) : canConvert ? (
            <ConvertButton id={org.id} name={org.name} />
          ) : null}
          <LeadActions orgId={org.id} stage={org.stage} isFounder={isFounder} />
        </div>
      </header>

      <div className="grid min-h-0 gap-4 lg:flex-1 lg:grid-cols-2">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <LeadNext
            orgId={org.id}
            stage={org.stage}
            events={events}
            isFounder={isFounder}
          />
          <LeadProfile org={org} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <LeadTimeline
            orgId={org.id}
            stage={org.stage}
            events={events}
            isFounder={isFounder}
          />
          <LeadFiles files={files} isFounder={isFounder} />
        </div>
      </div>
    </div>
  );
}
