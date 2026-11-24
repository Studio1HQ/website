"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Butterfly,
  DiscordLogo,
  FileText,
  GithubLogo,
  Globe,
  LinkedinLogo,
  PencilSimple,
  Plus,
  RedditLogo,
  Trash,
  XLogo,
  YoutubeLogo,
  type Icon,
} from "@/components/internal/icons";
import { saveClientLinks as saveClientLinksAction } from "@/app/internal/(dashboard)/clients/workspace-actions";
import { guarded } from "@/components/internal/guarded";
import {
  MAX_CLIENT_LINKS,
  MAX_LINK_LABEL,
  guessGroup,
  type ClientLink,
  type LinkGroup,
} from "@/lib/internal/clients/links";
import { NO_SECRETS_HINT, platformOf } from "@/lib/internal/clients/schema";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import {
  Card,
  CardTitle,
  ExternalLink,
  buttonClass,
  inputClass,
} from "@/components/internal/ui";
import {
  FormDialog,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";

const saveClientLinks = guarded(saveClientLinksAction);

/**
 * A client's links, in two places. The company's own (site, GitHub,
 * socials, community) sit under its name as icon chips (ClientLinks); our
 * planning docs and briefs get a card further down (ClientDocs). One list
 * and one editor for both: each link is a company link or a doc. Saved by
 * saveClientLinks, which checks every link.
 */

/** Icons for the client's own links; anything else gets a globe. */
const PLATFORM_ICONS: Record<string, Icon> = {
  GitHub: GithubLogo,
  X: XLogo,
  LinkedIn: LinkedinLogo,
  Discord: DiscordLogo,
  YouTube: YoutubeLogo,
  Reddit: RedditLogo,
  Bluesky: Butterfly,
};

export function ClientLinks({
  clientId,
  links,
  canEdit,
}: {
  clientId: string;
  /** Every link; only the company's show here. */
  links: readonly ClientLink[];
  canEdit: boolean;
}) {
  const company = links.filter((link) => link.group === "company");
  if (!company.length && !canEdit) return null;
  return (
    <div className="-mt-3 mb-6 flex flex-wrap items-center gap-1.5 text-[13px]">
      {company.length ? (
        company.map((link, index) => {
          const PlatformIcon =
            PLATFORM_ICONS[platformOf(link.url) ?? ""] ?? Globe;
          return (
            <a
              key={`${index}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              title={link.url}
              className="inline-flex min-w-0 max-w-[16rem] items-center gap-1.5 rounded-full border border-[var(--i-line)] bg-[var(--i-panel)] px-2.5 py-1 text-[12.5px] text-[var(--i-ink-2)] transition-colors hover:border-[var(--i-line-strong)] hover:text-[var(--i-ink)]"
            >
              <PlatformIcon size={13} className="shrink-0" />
              <span className="truncate">{link.label}</span>
            </a>
          );
        })
      ) : (
        <span className="text-[12.5px] text-[var(--i-faint)]">
          No company links yet: their site, GitHub, socials, community…
        </span>
      )}
      {canEdit ? (
        <ClientLinksDialog
          clientId={clientId}
          links={links}
          label={links.length ? "Edit links" : "Add links"}
        />
      ) : null}
    </div>
  );
}

/** The planning docs (blog topic lists, the content plan, briefs) as a card. */
export function ClientDocs({
  clientId,
  links,
  canEdit,
}: {
  clientId: string;
  links: readonly ClientLink[];
  canEdit: boolean;
}) {
  const docs = links.filter((link) => link.group === "doc");
  return (
    <Card className="h-fit">
      <CardTitle
        action={
          canEdit ? (
            <ClientLinksDialog
              clientId={clientId}
              links={links}
              label={docs.length ? "Edit" : "Add docs"}
              adding="doc"
            />
          ) : null
        }
      >
        Docs and plans{" "}
        <span className="font-normal text-[var(--i-faint)]">{docs.length}</span>
      </CardTitle>
      {docs.length ? (
        <ul className="divide-y divide-[var(--i-line)]">
          {docs.map((link, index) => (
            <li
              key={`${index}-${link.url}`}
              className="flex items-center gap-3 px-5 py-2.5"
            >
              <FileText size={15} className="shrink-0 text-[var(--i-muted)]" />
              <span className="min-w-0 flex-1">
                <ExternalLink href={link.url} className="text-[13.5px]">
                  {link.label}
                </ExternalLink>
              </span>
              <span className="shrink-0 text-[12px] text-[var(--i-faint)]">
                {siteLabel(link.url)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-start gap-2.5 px-5 py-5 text-[13px] text-[var(--i-muted)]">
          <FileText size={16} className="mt-0.5 shrink-0" />
          Planning docs live here: blog topic lists, the content plan, briefs.
        </p>
      )}
    </Card>
  );
}

/** "Notion", "Google Drive"… for a doc; the bare host otherwise. */
function siteLabel(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (/(^|\.)notion\.(so|site|com)$/.test(host)) return "Notion";
    if (host === "docs.google.com" || host === "drive.google.com")
      return "Google Drive";
    if (host.endsWith("figma.com")) return "Figma";
    return host;
  } catch {
    return "";
  }
}

type Row = Omit<ClientLink, "group"> & {
  key: number;
  /** null until someone picks: then it follows the link's site. */
  group: LinkGroup | null;
};

const GROUP_OPTIONS: { value: LinkGroup; label: string }[] = [
  { value: "company", label: "Company link" },
  { value: "doc", label: "Doc or plan" },
];

function ClientLinksDialog({
  clientId,
  links,
  label,
  adding = "company",
}: {
  clientId: string;
  links: readonly ClientLink[];
  label: string;
  /** What a new row starts as. */
  adding?: LinkGroup;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const start = (): Row[] => {
    const rows: Row[] = links.map((link, index) => ({ ...link, key: index }));
    return rows.length ? rows : [{ label: "", url: "", group: adding, key: 0 }];
  };
  /** The list as it's sent. */
  const sent = (list: readonly Row[]) =>
    list.map(({ label, url, group }) => ({
      label,
      url,
      group: group ?? guessGroup(url),
    }));
  const [rows, setRows] = useState<Row[]>(start);
  // The list is saved whole, so a save replaces whatever anyone else did to
  // it since the form opened. An untouched list, at least, isn't sent.
  const [opened, setOpened] = useState(() => JSON.stringify(sent(start())));
  const [nextKey, setNextKey] = useState(1000);
  const [error, setError] = useState<string | null>(null);
  const [busy, startSaving] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    const first = start();
    setRows(first);
    setOpened(JSON.stringify(sent(first)));
    setError(null);
  });

  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  const move = (index: number, by: -1 | 1) =>
    setRows((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const remove = (key: number) =>
    setRows((current) => current.filter((row) => row.key !== key));
  const add = () => {
    setRows((current) => [
      ...current,
      { label: "", url: "", group: adding, key: nextKey },
    ]);
    setNextKey((key) => key + 1);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const links = sent(rows);
    if (JSON.stringify(links) === opened) {
      setOpen(false);
      return;
    }
    startSaving(async () => {
      const result = await saveClientLinks(clientId, links);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Links saved");
      setOpen(false);
      afterSave();
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button type="button" className={buttonClass("ghost", "sm")}>
          <PencilSimple size={13} /> {label}
        </button>
      }
      title="Links and docs"
      description="The client's own links show under its name; docs and plans get their own card."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel="Save links"
    >
      <p className="text-[12px] leading-snug text-[var(--i-faint)] sm:col-span-2">
        {NO_SECRETS_HINT} Up to {MAX_CLIENT_LINKS} in all, in this order.
        Company links (site, GitHub, socials) sit under the client&apos;s name;
        docs and plans get their own card.
      </p>
      <ol className="space-y-3 sm:col-span-2">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className="grid gap-2 rounded-lg border border-[var(--i-line)] p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_9rem_auto] sm:items-center sm:border-0 sm:p-0"
          >
            <input
              type="text"
              aria-label={`Name of link ${index + 1}`}
              value={row.label}
              maxLength={MAX_LINK_LABEL}
              onChange={(event) =>
                update(row.key, { label: event.target.value })
              }
              placeholder="Blog plan (Notion)"
              className={inputClass()}
            />
            <input
              type="text"
              inputMode="url"
              autoComplete="url"
              aria-label={`Link ${index + 1}`}
              value={row.url}
              maxLength={1000}
              onChange={(event) => update(row.key, { url: event.target.value })}
              placeholder="https://"
              className={inputClass()}
            />
            <Select
              aria-label={`Kind of link ${index + 1}`}
              value={row.group ?? (row.url ? guessGroup(row.url) : adding)}
              onChange={(next) => update(row.key, { group: next })}
              options={GROUP_OPTIONS}
            />
            <span className="flex items-center justify-end gap-0.5">
              <button
                type="button"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className={buttonClass("ghost", "sm")}
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
                className={buttonClass("ghost", "sm")}
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => remove(row.key)}
                className={buttonClass("ghost", "sm")}
              >
                <Trash size={13} />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= MAX_CLIENT_LINKS}
          className={buttonClass("secondary", "sm")}
        >
          <Plus size={13} /> {adding === "doc" ? "Add a doc" : "Add a link"}
        </button>
      </div>
    </FormDialog>
  );
}
