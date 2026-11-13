"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  ArrowsDownUp,
  Check,
  CheckCircle,
  Clock,
  Copy,
  DotsThree,
  DownloadSimple,
  EnvelopeSimple,
  MagnifyingGlass,
  Tag,
  Tray,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { changeEntries } from "@/app/internal/(dashboard)/actions";
import { daysWaiting, rowTags, type FacetOptions, type Option, type Row } from "@/lib/internal/query";
import {
  FORM_SECTION,
  OVERDUE_DAYS,
  PAGE_SIZE,
  SECTIONS,
  SINCE,
  SORTS,
  filterParams,
  statusLabel,
  withQuery,
  type ColumnSpec,
  type Filters,
  type SectionKey,
  type SinceKey,
  type SortKey,
} from "@/lib/internal/sections";
import { atLeast, type Role } from "@/lib/internal/roles";
import { cn } from "@/lib/utils";
import { BulkEmailDialog } from "@/components/internal/bulk-email-dialog";
import { FilterMenu } from "@/components/internal/filter-menu";
import { EMAIL_TEMPLATES } from "@/lib/internal/email-templates";
import { mailtoHref } from "@/lib/form-checks";
import { programOf } from "@/lib/internal/program";
import { TagPicker, type TagState } from "@/components/internal/tag-picker";
import { useToast } from "@/components/internal/toast";
import {
  Avatar,
  EmptyState,
  Kbd,
  Notice,
  StatusBadge,
  StatusDot,
  TagChip,
  buttonClass,
  formatDate,
  inputClass,
  menuContentClass,
  menuItemClass,
  prettyUrl,
  relativeDate,
  safeUrl,
  text,
} from "@/components/internal/ui";

type Override = { status?: string; tags?: string[] };

export function ListView({
  sectionKey,
  rows,
  total,
  statusCounts,
  facets,
  tags,
  tagsReady,
  filters,
  role,
  overdue,
  sender,
  mailerReady,
  rowLimit,
}: {
  role: Role;
  overdue: number;
  /** The signed-in teammate's first name, for email sign-offs. */
  sender: string;
  mailerReady: boolean;
  /** Set when the table holds more rows than the dashboard reads: that many. */
  rowLimit: number | null;
  sectionKey: SectionKey;
  rows: Row[];
  total: number;
  statusCounts: Record<string, number>;
  facets: FacetOptions;
  tags: Option[];
  tagsReady: boolean;
  filters: Filters;
}) {
  const section = SECTIONS[sectionKey];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [navigating, startNavigation] = useTransition();
  const [, startAction] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [search, setSearch] = useState(filters.q ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  // Viewers read only; reviewers change entries; admins also export.
  const reviewable = Boolean(section.statuses) && atLeast(role, "reviewer");
  const taggable = section.tags && tagsReady && atLeast(role, "reviewer");
  const canExport = atLeast(role, "admin");

  // Fresh rows from the server replace any optimistic changes and selection.
  useEffect(() => {
    setOverrides({});
    setSelected(new Set());
  }, [rows]);

  // Follow the URL (back button, "Clear all"), but never while someone types.
  useEffect(() => {
    if (document.activeElement !== searchRef.current) setSearch(filters.q ?? "");
  }, [filters.q]);

  const navigate = useCallback(
    (change: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      change(params);
      params.delete("page");
      startNavigation(() => router.replace(withQuery(pathname, params), { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  // Search as you type, a beat after the last key.
  useEffect(() => {
    if ((filters.q ?? "") === search.trim()) return;
    const timer = setTimeout(
      () => navigate((params) => (search.trim() ? params.set("q", search.trim()) : params.delete("q"))),
      250,
    );
    return () => clearTimeout(timer);
  }, [search, filters.q, navigate]);

  // "/" jumps to search; Escape clears the selection.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable=true]");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape" && !typing) {
        setSelected(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleParam = (key: string, value: string) =>
    navigate((params) => {
      const values = params.getAll(key);
      params.delete(key);
      const exists = values.some((item) => item.toLowerCase() === value.toLowerCase());
      for (const item of exists ? values.filter((v) => v.toLowerCase() !== value.toLowerCase()) : [...values, value]) {
        params.append(key, item);
      }
    });

  const listQuery = filterParams(filters, { page: false });
  const view = rows.map((row) => {
    const id = String(row[section.idColumn]);
    const override = overrides[id];
    return {
      ...row,
      ...(override?.status ? { review_status: override.status } : {}),
      ...(override?.tags ? { tags: override.tags } : {}),
      _id: id,
    } as Row & { _id: string };
  });

  const hrefFor = (row: Row & { _id: string }) => {
    if (section.detail) return withQuery(`${section.path}/${row._id}`, listQuery);
    const target = FORM_SECTION[String(row.form ?? "")];
    return target && row.record_id ? `${SECTIONS[target].path}/${row.record_id}` : null;
  };

  /* ------------------------------------------------------------ actions */

  const run = (ids: string[], change: { status?: string; addTags?: string[]; removeTags?: string[] }, done: string) => {
    if (!ids.length) return;
    setOverrides((current) => {
      const next = { ...current };
      for (const id of ids) {
        const row = view.find((item) => item._id === id);
        const own = row ? rowTags(row) : [];
        let tagList = own;
        if (change.addTags || change.removeTags) {
          const remove = (change.removeTags ?? []).map((tag) => tag.toLowerCase());
          tagList = own.filter((tag) => !remove.includes(tag.toLowerCase()));
          for (const tag of change.addTags ?? []) {
            if (!tagList.some((item) => item.toLowerCase() === tag.toLowerCase())) tagList = [...tagList, tag];
          }
        }
        next[id] = {
          ...next[id],
          ...(change.status ? { status: change.status } : {}),
          ...(change.addTags || change.removeTags ? { tags: tagList } : {}),
        };
      }
      return next;
    });
    startAction(async () => {
      const result = await changeEntries(section.key, ids, change);
      if (result.ok) {
        toast("success", done);
      } else {
        setOverrides((current) => {
          const next = { ...current };
          for (const id of ids) delete next[id];
          return next;
        });
        toast("error", result.message);
      }
    });
  };

  const plural = (count: number) => `${count} ${count === 1 ? "entry" : "entries"}`;
  const setStatus = (ids: string[], status: string) =>
    run(ids, { status }, `${ids.length === 1 ? "Moved" : `Moved ${plural(ids.length)}`} to ${statusLabel(status)}`);
  const toggleTag = (ids: string[], tag: string, add: boolean) =>
    run(
      ids,
      add ? { addTags: [tag] } : { removeTags: [tag] },
      `${add ? "Tagged" : "Removed"} “${tag}”${ids.length > 1 ? ` ${add ? "on" : "from"} ${plural(ids.length)}` : ""}`,
    );

  const tagStateFor = (ids: string[]) => (tag: string): TagState => {
    const lower = tag.toLowerCase();
    const having = ids.filter((id) =>
      rowTags(view.find((row) => row._id === id) ?? {}).some((item) => item.toLowerCase() === lower),
    ).length;
    return having === 0 ? "none" : having === ids.length ? "all" : "some";
  };

  /* ---------------------------------------------------------- selection */

  const pageIds = view.map((row) => row._id);
  const selectedIds = pageIds.filter((id) => selected.has(id));
  const allSelected = pageIds.length > 0 && selectedIds.length === pageIds.length;
  const toggleRow = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* -------------------------------------------------------------- chips */

  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const facet of facets) {
    const chosen = filters.facets[facet.key];
    if (!chosen?.length) continue;
    const names = chosen.map((value) => facet.options.find((option) => option.value === value)?.label ?? value);
    chips.push({
      key: facet.key,
      label: `${facet.label}: ${names.join(", ")}`,
      remove: () => navigate((params) => params.delete(facet.key)),
    });
  }
  if (filters.tags.length) {
    chips.push({
      key: "tag",
      label: `Tag: ${filters.tags.join(", ")}`,
      remove: () => navigate((params) => params.delete("tag")),
    });
  }
  if (filters.overdue) {
    chips.push({
      key: "overdue",
      label: `Waiting over ${OVERDUE_DAYS} days`,
      remove: () => navigate((params) => params.delete("overdue")),
    });
  }
  if (filters.since) {
    chips.push({
      key: "since",
      label: SINCE[filters.since].label,
      remove: () => navigate((params) => params.delete("since")),
    });
  }
  const filtered = chips.length > 0 || Boolean(filters.q) || Boolean(filters.status);

  /* ------------------------------------------------------------ columns */

  const columns = section.columns.filter((column) => column.kind !== "tags" || section.tags);
  const cell = (row: Row & { _id: string }, column: ColumnSpec) => {
    const value = row[column.key];
    switch (column.kind) {
      case "person": {
        const href = hrefFor(row);
        const name = text(row.name) || text(row.email) || "Unnamed";
        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={text(row.name)} email={text(row.email)} size={32} />
            <div className="min-w-0">
              {href ? (
                <Link
                  href={href}
                  className="block truncate font-medium text-[var(--i-ink)] hover:underline hover:underline-offset-2"
                >
                  {name}
                </Link>
              ) : (
                <span className="block truncate font-medium">{name}</span>
              )}
              <span className="block truncate text-[12.5px] text-[var(--i-muted)]">{text(row.email)}</span>
              {Array.isArray(row._also) && row._also.length ? (
                <span
                  title={`Also: ${row._also.join(", ")}`}
                  className="mt-1 inline-flex items-center rounded-md bg-sky-50 px-1.5 py-px text-[11.5px] font-medium text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25"
                >
                  {row._also.length + 1} {section.key === "hackathons" ? "registrations" : "applications"}
                </span>
              ) : null}
            </div>
          </div>
        );
      }
      case "status":
        return row._overdue ? (
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge status={value} />
            <span
              title={`Waiting ${daysWaiting(row, section)} days for a first look`}
              className="inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums text-rose-700 dark:text-rose-300"
            >
              <Clock size={13} weight="bold" />
              {daysWaiting(row, section)}d
            </span>
          </span>
        ) : (
          <StatusBadge status={value} />
        );
      case "tags": {
        const list = rowTags(row);
        if (!list.length) return <span className="text-[var(--i-faint)]">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.slice(0, 2).map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
            {list.length > 2 ? (
              <span className="rounded-md px-1 py-0.5 text-[12px] text-[var(--i-muted)]" title={list.slice(2).join(", ")}>
                +{list.length - 2}
              </span>
            ) : null}
          </div>
        );
      }
      case "date":
        return (
          <span title={formatDate(value)} suppressHydrationWarning className="whitespace-nowrap text-[var(--i-muted)]">
            {relativeDate(value)}
          </span>
        );
      case "link": {
        const url = safeUrl(value);
        return url ? (
          <a
            href={url.toString()}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="block max-w-[12rem] truncate text-[var(--i-ink-2)] underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:text-[var(--i-accent-text)]"
          >
            {prettyUrl(url)}
          </a>
        ) : (
          <span className="text-[var(--i-faint)]">—</span>
        );
      }
      case "list": {
        const list = Array.isArray(value) ? value.map((item) => column.labels?.[String(item)] ?? String(item)) : [];
        return list.length ? <span className="text-[var(--i-ink-2)]">{list.join(", ")}</span> : <span className="text-[var(--i-faint)]">—</span>;
      }
      case "team": {
        const team = text(value);
        const label = team === "team" ? text(row.team_name) || "Team" : (column.labels?.[team] ?? team);
        return label ? <span className="text-[var(--i-ink-2)]">{label}</span> : <span className="text-[var(--i-faint)]">—</span>;
      }
      default:
        return text(value) ? (
          <span className="block max-w-[16rem] truncate text-[var(--i-ink-2)]">{text(value)}</span>
        ) : (
          <span className="text-[var(--i-faint)]">—</span>
        );
    }
  };

  const onRowClick = (event: MouseEvent<HTMLTableRowElement>, href: string | null) => {
    if (!href) return;
    const target = event.target as HTMLElement;
    // Menus render in portals; their clicks still bubble here through React.
    if (!event.currentTarget.contains(target)) return;
    if (target.closest("a, button, input, label")) return;
    if (window.getSelection()?.toString()) return;
    if (event.metaKey || event.ctrlKey) window.open(href, "_blank");
    else router.push(href);
  };

  const exportHref = (ids?: string[]) => {
    const params = filterParams(filters, { page: false });
    for (const id of ids ?? []) params.append("ids", id);
    return withQuery(`/internal/export/${section.key}`, params);
  };

  const start = (filters.page - 1) * PAGE_SIZE;
  const pageHref = (page: number) => {
    const params = filterParams({ ...filters, page });
    return withQuery(pathname, params);
  };

  /* ------------------------------------------------------------- render */

  return (
    <>
      {section.statuses ? (
        <nav aria-label="Status" className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
          {["all", ...section.statuses].map((status) => {
            const value = status === "all" ? undefined : status;
            const count = statusCounts[status] ?? 0;
            const current = filters.status === value;
            if (!current && status !== "all" && status !== "new" && count === 0) return null;
            return (
              <button
                key={status}
                type="button"
                onClick={() => navigate((params) => (value ? params.set("status", value) : params.delete("status")))}
                aria-pressed={current}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] transition-colors",
                  current
                    ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)]"
                    : "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
                )}
              >
                {value ? <StatusDot status={value} /> : null}
                {value ? statusLabel(value) : "All"}
                <span className={cn("tabular-nums text-[12px]", current ? "text-[var(--i-muted)]" : "text-[var(--i-faint)]")}>
                  {count}
                </span>
              </button>
            );
          })}
          {overdue > 0 || filters.overdue ? (
            <button
              type="button"
              onClick={() =>
                navigate((params) => (filters.overdue ? params.delete("overdue") : params.set("overdue", "1")))
              }
              aria-pressed={Boolean(filters.overdue)}
              title={`New entries waiting over ${OVERDUE_DAYS} days`}
              className={cn(
                "ml-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors",
                filters.overdue
                  ? "bg-rose-50 font-medium text-rose-800 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30"
                  : "text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10",
              )}
            >
              <Clock size={14} weight="bold" />
              Overdue
              <span className="text-[12px] tabular-nums opacity-80">{overdue}</span>
            </button>
          ) : null}
        </nav>
      ) : null}

      {rowLimit ? (
        <div className="mb-4">
          <Notice tone="warning">
            This list is longer than the dashboard reads at once. Only the newest {rowLimit.toLocaleString("en-IN")} entries
            are shown, counted{canExport ? " and exported" : ""}; older ones are still in Supabase.
          </Notice>
        </div>
      ) : null}

      {section.tags && !tagsReady ? (
        <div className="mb-4">
          <Notice tone="warning">
            Tags switch on once the dashboard migration has run in Supabase
            (<code className="text-[12px]">20261112120000_internal_dashboard.sql</code>).
          </Notice>
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--i-line)] p-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--i-faint)]"
            />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, tags…"
              aria-label="Search"
              className={cn(inputClass("sm"), "pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden")}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 sm:block">
              {search ? null : <Kbd>/</Kbd>}
            </span>
          </div>
          <FilterMenu
            facets={facets}
            tags={section.tags && tagsReady ? tags : null}
            filters={filters}
            dateLabel={section.dateColumn === "last_seen" ? "Last seen" : "Date received"}
            onFacet={toggleParam}
            onTag={(tag) => toggleParam("tag", tag)}
            onSince={(since: SinceKey | undefined) =>
              navigate((params) => (since ? params.set("since", since) : params.delete("since")))
            }
          />
          <Menu.Root>
            <Menu.Trigger asChild>
              <button type="button" className={buttonClass("ghost")}>
                <ArrowsDownUp size={15} />
                <span className="hidden sm:inline">{SORTS[filters.sort]}</span>
              </button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content align="start" sideOffset={6} className={menuContentClass}>
                <Menu.RadioGroup
                  value={filters.sort}
                  onValueChange={(sort) =>
                    navigate((params) => (sort === "newest" ? params.delete("sort") : params.set("sort", sort as SortKey)))
                  }
                >
                  {(Object.keys(SORTS) as SortKey[]).map((key) => (
                    <Menu.RadioItem key={key} value={key} className={menuItemClass}>
                      <span className="flex-1">{SORTS[key]}</span>
                      <Menu.ItemIndicator>
                        <Check size={14} className="text-[var(--i-accent)]" />
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
          {canExport ? (
            <a href={exportHref()} className={cn(buttonClass("ghost"), "ml-auto")}>
              <DownloadSimple size={15} />
              <span className="hidden sm:inline">Export CSV</span>
            </a>
          ) : null}
        </div>

        {chips.length ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--i-line)] px-3 py-2">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--i-line)] bg-[var(--i-sunken)] py-0.5 pl-2 pr-0.5 text-[12.5px]"
              >
                <span className="truncate">{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.remove}
                  aria-label={`Remove filter ${chip.label}`}
                  className="flex size-5 items-center justify-center rounded text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => startNavigation(() => router.replace(pathname, { scroll: false }))}
              className="px-1.5 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
            >
              Clear all
            </button>
          </div>
        ) : null}

        <div className={cn("transition-opacity", navigating && "pointer-events-none opacity-60")}>
          {view.length === 0 ? (
            <EmptyState
              icon={<Tray size={20} />}
              title={filtered ? "Nothing matches" : "Nothing here yet"}
              action={
                filtered ? (
                  <button
                    type="button"
                    className={buttonClass("secondary")}
                    onClick={() => startNavigation(() => router.replace(pathname, { scroll: false }))}
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            >
              {filtered
                ? "Try a different search or remove a filter."
                : "Entries from the site's form will show up here as they come in."}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)]">
                    {reviewable ? (
                      <th scope="col" className="w-10 py-2.5 pl-4 pr-1">
                        <input
                          type="checkbox"
                          aria-label="Select all on this page"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = selectedIds.length > 0 && !allSelected;
                          }}
                          onChange={() => setSelected(allSelected ? new Set() : new Set(pageIds))}
                          className="size-4 rounded border-[var(--i-line-strong)] accent-[var(--i-accent)]"
                        />
                      </th>
                    ) : null}
                    {columns.map((column, index) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={cn(
                          "whitespace-nowrap px-3 py-2.5 font-medium",
                          index === 0 && !reviewable && "pl-4",
                          column.wide && "hidden lg:table-cell",
                        )}
                      >
                        {column.label}
                      </th>
                    ))}
                    {reviewable ? <th scope="col" className="w-28 pr-3"><span className="sr-only">Actions</span></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {view.map((row) => {
                    const href = hrefFor(row);
                    const isSelected = selected.has(row._id);
                    const status = String(row.review_status ?? "");
                    return (
                      <tr
                        key={row._id}
                        onClick={(event) => onRowClick(event, href)}
                        className={cn(
                          "group border-b border-[var(--i-line)] align-middle transition-colors last:border-b-0",
                          href && "cursor-pointer",
                          isSelected ? "bg-[var(--i-selected)]" : "hover:bg-[var(--i-hover)]",
                        )}
                      >
                        {reviewable ? (
                          <td className="py-3 pl-4 pr-1">
                            <input
                              type="checkbox"
                              aria-label={`Select ${text(row.name) || "entry"}`}
                              checked={isSelected}
                              onChange={() => toggleRow(row._id)}
                              className="size-4 rounded border-[var(--i-line-strong)] accent-[var(--i-accent)]"
                            />
                          </td>
                        ) : null}
                        {columns.map((column, index) => (
                          <td
                            key={column.key}
                            className={cn(
                              "px-3 py-3",
                              index === 0 && !reviewable && "pl-4",
                              column.kind === "person" && "min-w-[220px] max-w-[300px]",
                              column.wide && "hidden lg:table-cell",
                            )}
                          >
                            {cell(row, column)}
                          </td>
                        ))}
                        {reviewable && section.quick ? (
                          <td className="py-2 pr-3">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                              <button
                                type="button"
                                title={statusLabel(section.quick.positive)}
                                aria-label={`${statusLabel(section.quick.positive)} ${text(row.name)}`}
                                disabled={status === section.quick.positive}
                                onClick={() => setStatus([row._id], section.quick!.positive)}
                                className="flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-violet-500/10 hover:text-violet-700 disabled:opacity-30 dark:hover:text-violet-300"
                              >
                                <CheckCircle size={17} />
                              </button>
                              <button
                                type="button"
                                title={statusLabel(section.quick.negative)}
                                aria-label={`${statusLabel(section.quick.negative)} ${text(row.name)}`}
                                disabled={status === section.quick.negative}
                                onClick={() => setStatus([row._id], section.quick!.negative)}
                                className="flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-30 dark:hover:text-rose-300"
                              >
                                <XCircle size={17} />
                              </button>
                              <RowMenu
                                row={row}
                                statuses={section.statuses ?? []}
                                tags={taggable ? tags : []}
                                onStatus={(value) => setStatus([row._id], value)}
                                onTag={(tag, add) => toggleTag([row._id], tag, add)}
                                onCopy={() => {
                                  void navigator.clipboard.writeText(text(row.email));
                                  toast("success", "Email copied");
                                }}
                              />
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > 0 ? (
          <div className="flex items-center justify-between gap-4 border-t border-[var(--i-line)] px-4 py-2.5 text-[12.5px] text-[var(--i-muted)]">
            <span className="tabular-nums">
              {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1.5">
              {filters.page > 1 ? (
                <Link href={pageHref(filters.page - 1)} scroll={false} className={buttonClass("secondary", "sm")}>
                  Previous
                </Link>
              ) : null}
              {start + PAGE_SIZE < total ? (
                <Link href={pageHref(filters.page + 1)} scroll={false} className={buttonClass("secondary", "sm")}>
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {selectedIds.length > 0 && reviewable ? (
        <div
          role="toolbar"
          aria-label="Selected entries"
          className="internal-rise fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-xl bg-[#1c1917] p-1.5 pl-3.5 text-[13px] text-stone-100 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        >
          <span className="whitespace-nowrap pr-2 font-medium tabular-nums">{selectedIds.length} selected</span>
          <Menu.Root>
            <Menu.Trigger asChild>
              <button type="button" className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 hover:bg-white/10">
                <CheckCircle size={15} /> Status
              </button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content side="top" align="start" sideOffset={8} className={menuContentClass}>
                {(section.statuses ?? []).map((value) => (
                  <Menu.Item key={value} className={menuItemClass} onSelect={() => setStatus(selectedIds, value)}>
                    <StatusDot status={value} />
                    {statusLabel(value)}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
          {EMAIL_TEMPLATES[section.key] ? (
            <BulkEmailDialog
              sectionKey={section.key}
              sender={sender}
              mailerReady={mailerReady}
              onSent={() => setSelected(new Set())}
              recipients={view
                .filter((row) => selected.has(row._id))
                .map((row) => ({
                  id: row._id,
                  name: text(row.name),
                  email: text(row.email),
                  program: programOf(section, row),
                }))}
            >
              <button type="button" className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 hover:bg-white/10">
                <EnvelopeSimple size={15} /> Email
              </button>
            </BulkEmailDialog>
          ) : null}
          {taggable ? (
            <TagPicker
              options={tags}
              side="top"
              state={tagStateFor(selectedIds)}
              onToggle={(tag, add) => toggleTag(selectedIds, tag, add)}
            >
              <button type="button" className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 hover:bg-white/10">
                <Tag size={15} /> Tag
              </button>
            </TagPicker>
          ) : null}
          {canExport ? (
            <a href={exportHref(selectedIds)} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 hover:bg-white/10">
              <DownloadSimple size={15} /> Export
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
            className="ml-1 flex size-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </>
  );
}

function RowMenu({
  row,
  statuses,
  tags,
  onStatus,
  onTag,
  onCopy,
}: {
  row: Row;
  statuses: readonly string[];
  tags: Option[];
  onStatus: (status: string) => void;
  onTag: (tag: string, add: boolean) => void;
  onCopy: () => void;
}) {
  const own = rowTags(row).map((tag) => tag.toLowerCase());
  const email = text(row.email);
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label={`More actions for ${text(row.name) || "entry"}`}
          className="flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)] data-[state=open]:bg-[var(--i-hover)]"
        >
          <DotsThree size={18} weight="bold" />
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} collisionPadding={12} className={menuContentClass}>
          <Menu.Sub>
            <Menu.SubTrigger className={menuItemClass}>
              <CheckCircle size={15} className="text-[var(--i-muted)]" />
              <span className="flex-1">Set status</span>
            </Menu.SubTrigger>
            <Menu.Portal>
              <Menu.SubContent sideOffset={6} className={menuContentClass}>
                {statuses.map((value) => (
                  <Menu.Item key={value} className={menuItemClass} onSelect={() => onStatus(value)}>
                    <StatusDot status={value} />
                    <span className="flex-1">{statusLabel(value)}</span>
                    {row.review_status === value ? <Check size={14} className="text-[var(--i-accent)]" /> : null}
                  </Menu.Item>
                ))}
              </Menu.SubContent>
            </Menu.Portal>
          </Menu.Sub>
          {tags.length ? (
            <Menu.Sub>
              <Menu.SubTrigger className={menuItemClass}>
                <Tag size={15} className="text-[var(--i-muted)]" />
                <span className="flex-1">Tags</span>
              </Menu.SubTrigger>
              <Menu.Portal>
                <Menu.SubContent sideOffset={6} className={cn(menuContentClass, "max-h-72 overflow-y-auto")}>
                  {tags.map((option) => {
                    const on = own.includes(option.value.toLowerCase());
                    return (
                      <Menu.CheckboxItem
                        key={option.value}
                        checked={on}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={() => onTag(option.value, !on)}
                        className={menuItemClass}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-4 items-center justify-center rounded border",
                            on ? "border-[var(--i-ink)] bg-[var(--i-ink)] text-[var(--i-panel)]" : "border-[var(--i-line-strong)]",
                          )}
                        >
                          {on ? <Check size={11} weight="bold" /> : null}
                        </span>
                        <TagChip tag={option.value} />
                      </Menu.CheckboxItem>
                    );
                  })}
                </Menu.SubContent>
              </Menu.Portal>
            </Menu.Sub>
          ) : null}
          <Menu.Separator className="my-1 h-px bg-[var(--i-line)]" />
          {email ? (
            <>
              <Menu.Item className={menuItemClass} onSelect={onCopy}>
                <Copy size={15} className="text-[var(--i-muted)]" /> Copy email
              </Menu.Item>
              <Menu.Item className={menuItemClass} asChild>
                <a href={mailtoHref(email)}>
                  <EnvelopeSimple size={15} className="text-[var(--i-muted)]" /> Send email
                </a>
              </Menu.Item>
            </>
          ) : null}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
