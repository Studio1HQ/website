import type { Metadata } from "next";
import Link from "next/link";
import { requireClients } from "@/lib/internal/session";
import {
  incomplete,
  loadPeople,
  loadTemplates,
  ownerChoices,
} from "@/lib/internal/clients/data";
import {
  ENGAGEMENT_TYPES,
  SIZES,
  SIZE_POINTS,
  templateFor,
  personName,
} from "@/lib/internal/clients/schema";
import { Notice, PageHeader } from "@/components/internal/ui";
import {
  ClientsLoadNotice,
  ClientsMigrationNotice,
} from "@/components/internal/clients/ui";
import { TemplateCard } from "@/components/internal/clients/template-card";
import { CapacityTable } from "@/components/internal/clients/capacity-table";
import type { CapacityPerson } from "@/components/internal/clients/capacity-dialog";

export const metadata: Metadata = { title: "Templates & capacity" };

/**
 * Client managers only: each engagement type's default monthly scope (what
 * a new month starts with) and the weekly rhythm, and people's weekly
 * capacity in points for the load page.
 */
export default async function ClientsTemplatesPage() {
  await requireClients("manager");
  const [templates, people, choices] = await Promise.all([
    loadTemplates(),
    loadPeople(),
    ownerChoices(),
  ]);
  const header = (
    <PageHeader
      eyebrow="Clients"
      title="Templates & capacity"
      description="What each kind of engagement starts its month with, and how much work each person can take in a week."
    />
  );
  if (!templates.ok || !people.ok) {
    const missing =
      (!templates.ok && templates.missing) || (!people.ok && people.missing);
    const message = !templates.ok
      ? templates.message
      : !people.ok
        ? people.message
        : "";
    return (
      <>
        {header}
        {missing ? (
          <ClientsMigrationNotice />
        ) : (
          <Notice tone="error">{message}</Notice>
        )}
      </>
    );
  }

  const saved = new Map(
    people.rows.map((person) => [person.email.toLowerCase(), person]),
  );
  const rows: CapacityPerson[] = [
    ...people.rows.map((person) => ({
      email: person.email.toLowerCase(),
      name: person.name,
      role: person.role,
      weekly_capacity: person.weekly_capacity,
      slack_user_id: person.slack_user_id,
      active: person.active,
    })),
    ...choices
      .map((email) => email.toLowerCase())
      .filter((email) => !saved.has(email))
      .map((email) => ({
        email,
        // Not on the list yet: their name from the address, not the address.
        name: personName(email),
        role: null,
        weekly_capacity: null,
        slack_user_id: "",
        active: true,
      })),
  ].sort(
    (a, b) =>
      Number(b.role !== null && b.active) -
        Number(a.role !== null && a.active) ||
      (a.name || a.email).localeCompare(b.name || b.email),
  );
  const points = SIZES.map(
    (size) => `${size.value} = ${SIZE_POINTS[size.value]}`,
  ).join(", ");

  return (
    <>
      {header}
      <ClientsLoadNotice show={incomplete(templates, people)} />

      <section aria-labelledby="templates-heading" className="mb-10">
        <h2 id="templates-heading" className="text-[15px] font-medium">
          Scope templates
        </h2>
        <p className="mb-4 mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--i-muted)]">
          Quantities are set per contract; this only sets what next month&apos;s
          cycle starts with. The account owner adjusts each month before it goes
          active.
        </p>
        <div className="grid gap-5 lg:grid-cols-2">
          {ENGAGEMENT_TYPES.map((type) => {
            const template = templateFor(type.value, templates.rows);
            return (
              <TemplateCard
                key={type.value}
                type={type.value}
                lines={template.lines}
                rhythm={template.rhythm}
                custom={template.custom}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="capacity-heading">
        <h2 id="capacity-heading" className="text-[15px] font-medium">
          Capacity
        </h2>
        <p className="mb-4 mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--i-muted)]">
          Weekly capacity is in points: each piece counts by its size ({points}
          ).{" "}
          <Link
            href="/internal/clients/load"
            className="text-[var(--i-ink)] underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:text-[var(--i-accent-text)]"
          >
            See this week&apos;s load
          </Link>
          .
        </p>
        <CapacityTable people={rows} />
      </section>
    </>
  );
}
