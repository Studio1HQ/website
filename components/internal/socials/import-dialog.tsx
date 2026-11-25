"use client";

import {
  useState,
  useTransition,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  importMonth as importMonthAction,
  importMonths as importMonthsAction,
} from "@/app/internal/(dashboard)/socials/actions";
import { FileText, UploadSimple, X } from "@/components/internal/icons";
import { parseCount } from "@/lib/internal/clients/clean";
import { monthLabel, shiftMonth } from "@/lib/internal/clients/schema";
import {
  buildMonth,
  defaultMonth,
  monthsIn,
  parseExport,
  planMonths,
  wholeMonths,
  type ImportPlatform,
  type MonthDraft,
  type MonthPlan,
  type ParsedExport,
} from "@/lib/internal/socials/import";
import {
  DEMOGRAPHIC_LABELS,
  statLabel,
  statText,
  type StatKey,
} from "@/lib/internal/socials/insights";
import { readSheets } from "@/lib/internal/socials/sheets";
import { STUDIO_ACCOUNT, platformInfo } from "@/lib/internal/socials/schema";
import { cn } from "@/lib/utils";
import { guarded } from "@/components/internal/guarded";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import { inputClass } from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";
import { PlatformLogo } from "@/components/internal/socials/platform-logo";

const importMonth = guarded(importMonthAction);
const importMonths = guarded(importMonthsAction);

/**
 * Upload LinkedIn and X analytics exports: a month at a time, or every
 * whole month the files cover (a 90-day LinkedIn export holds two or
 * three). The files are read here in the browser (lib/internal/socials/
 * sheets.ts and import.ts); only the months' numbers go to the server.
 * Several files at once is fine: a LinkedIn Page's Content, Followers and
 * Visitors exports, and X's.
 */

/** A month's followers logged so far, to carry on from and to keep. */
export type LoggedFollowers = {
  account: string;
  platform: string;
  month: string;
  followers: number;
};

type Picked = {
  id: number;
  name: string;
  status: "reading" | "ok" | "error";
  parsed?: ParsedExport;
  message?: string;
};

const MAX_BYTES = 15_000_000;
/** The Month choice for every whole month in the files. */
const ALL = "all";
const ORDER: ImportPlatform[] = ["linkedin", "x", "youtube"];
const counts = new Intl.NumberFormat("en-US");
let nextId = 1;

export function ImportDialog({
  accounts,
  account: startAccount = STUDIO_ACCOUNT,
  logged,
  today,
  trigger,
}: {
  accounts: readonly string[];
  /** Whose account to start on. */
  account?: string;
  logged: readonly LoggedFollowers[];
  /** "YYYY-MM-DD", in IST. */
  today: string;
  trigger: ReactNode;
}) {
  const toast = useToast();
  const [files, setFiles] = useState<Picked[]>([]);
  const [account, setAccount] = useState(startAccount);
  const [month, setMonth] = useState<string | null>(null);
  /** Followers typed in, by "platform:month". */
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startSaving] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setFiles([]);
    setAccount(startAccount);
    setMonth(null);
    setTyped({});
    setError(null);
  });

  const parsed = files.flatMap((file) => (file.parsed ? [file.parsed] : []));
  const choices = monthsIn(parsed, today);
  const whole = wholeMonths(choices);
  const several = whole.length > 1;
  const chosen =
    (month === ALL && several) ||
    (month && choices.some((choice) => choice.month === month))
      ? month
      : several
        ? ALL
        : defaultMonth(choices);
  const platforms = ORDER.filter((platform) =>
    parsed.some((file) => file.platform === platform),
  );
  const loggedFor = (platform: string, key: string) =>
    logged.find(
      (row) =>
        row.account.toLowerCase() === account.trim().toLowerCase() &&
        row.platform === platform &&
        row.month === key,
    );
  const typedFor = (platform: string, key: string) => {
    const raw = typed[`${platform}:${key}`]?.trim();
    return raw ? parseCount(raw) : null;
  };
  const plans: MonthPlan[] =
    chosen === ALL
      ? planMonths(parsed, platforms, whole, today, {
          typed: typedFor,
          logged: (platform, key) =>
            loggedFor(platform, key)?.followers ?? null,
        })
      : chosen
        ? [
            {
              month: chosen,
              drafts: platforms.map((platform) => {
                const before = loggedFor(platform, shiftMonth(chosen, -1));
                return buildMonth(
                  parsed,
                  platform,
                  chosen,
                  today,
                  before ?? null,
                );
              }),
            },
          ]
        : [];
  const drafts = plans.flatMap((plan) => plan.drafts);
  const followersOf = (draft: MonthDraft) =>
    typed[`${draft.platform}:${draft.month}`] ??
    grouped(
      draft.followers ??
        loggedFor(draft.platform, draft.month)?.followers ??
        null,
    );
  const onFollowers = (draft: MonthDraft, value: string) =>
    setTyped((current) => ({
      ...current,
      [`${draft.platform}:${draft.month}`]: value,
    }));
  const rowsOf = (plan: MonthPlan) =>
    plan.drafts.map((draft) => ({
      platform: draft.platform,
      followers: followersOf(draft),
      impressions: draft.impressions,
      engagements: draft.engagements,
      posts: draft.posts,
      insights: draft.insights,
    }));
  const partly = choices
    .filter((choice) => choice.days > 0 && choice.days < choice.of)
    .map((choice) => monthLabel(choice.month))
    .reverse();

  async function add(list: FileList | null) {
    const picked = [...(list ?? [])];
    if (!picked.length) return;
    setError(null);
    const entries = picked.map((file) => ({
      file,
      entry: { id: nextId++, name: file.name, status: "reading" } as Picked,
    }));
    setFiles((current) => [...current, ...entries.map(({ entry }) => entry)]);
    for (const { file, entry } of entries) {
      let done: Picked;
      if (file.size > MAX_BYTES) {
        done = {
          ...entry,
          status: "error",
          message: "Too big for an analytics export.",
        };
      } else {
        try {
          const sheets = await readSheets(
            new Uint8Array(await file.arrayBuffer()),
          );
          const result = parseExport(file.name, sheets);
          done = result.ok
            ? { ...entry, status: "ok", parsed: result.export }
            : {
                ...entry,
                status: "error",
                message: result.message.replace(`${file.name}: `, ""),
              };
        } catch {
          done = {
            ...entry,
            status: "error",
            message:
              "Couldn't open this file. Add it as it downloaded: CSV, XLS, XLSX or ZIP.",
          };
        }
      }
      setFiles((current) =>
        current.map((item) => (item.id === entry.id ? done : item)),
      );
    }
  }

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    void add(event.dataTransfer.files);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!chosen || !drafts.length) {
      setError("Add a LinkedIn, X or YouTube export first.");
      return;
    }
    if (files.some((file) => file.status === "reading")) {
      setError("Still reading the files. A moment.");
      return;
    }
    const empty = drafts.find((draft) => !followersOf(draft).trim());
    if (empty) {
      const info = platformInfo(empty.platform);
      setError(
        `Add ${info.label}'s ${info.unit} at the end of ${monthLabel(empty.month)}.`,
      );
      return;
    }
    setError(null);
    startSaving(async () => {
      const result =
        chosen === ALL
          ? await importMonths({
              account,
              months: plans.map((plan) => ({
                month: plan.month,
                rows: rowsOf(plan),
              })),
            })
          : await importMonth({
              account,
              month: chosen,
              rows: rowsOf(plans[0]),
            });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Imported");
      setOpen(false);
    });
  };

  const listId = "social-import-accounts";
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title="Upload stats"
      description="LinkedIn, X and YouTube analytics exports, for one month or several."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={
        !drafts.length
          ? "Import"
          : chosen === ALL
            ? `Import ${plans.length} months`
            : `Import ${monthLabel(chosen ?? "")}`
      }
    >
      <div className="sm:col-span-2">
        <label
          htmlFor="social-import-files"
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
            over
              ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)]"
              : "border-[var(--i-line-strong)] hover:bg-[var(--i-hover)]",
          )}
        >
          <UploadSimple size={18} className="text-[var(--i-muted)]" />
          <span className="text-[13px] text-[var(--i-ink)]">
            Drop the export files here, or{" "}
            <span className="underline underline-offset-2">choose them</span>
          </span>
          <span className="text-[11.5px] text-[var(--i-faint)]">
            CSV, XLS, XLSX or ZIP, as LinkedIn, X and YouTube download them.
            Read here; only the numbers are saved.
          </span>
          <input
            id="social-import-files"
            type="file"
            multiple
            accept=".csv,.xls,.xlsx,.zip,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
            className="sr-only"
            onChange={(event) => {
              void add(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {!files.length ? (
          <ul className="mt-3 space-y-1 text-[12px] leading-snug text-[var(--i-muted)]">
            <li>
              <b className="font-medium text-[var(--i-ink-2)]">
                LinkedIn profile:
              </b>{" "}
              your profile&apos;s analytics → Export, with the dates set to the
              month.
            </li>
            <li>
              <b className="font-medium text-[var(--i-ink-2)]">
                LinkedIn Page:
              </b>{" "}
              Page analytics → Content, Followers and Visitors → Export each one
              for the month.
            </li>
            <li>
              <b className="font-medium text-[var(--i-ink-2)]">X:</b> Analytics
              → Export data, for the month (the account overview, and the posts
              if you like).
            </li>
            <li>
              <b className="font-medium text-[var(--i-ink-2)]">YouTube:</b>{" "}
              Studio → Analytics → Advanced mode → Content, with the dates set
              to the month → Export → CSV (a .zip; add it as it is).
            </li>
          </ul>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--i-line)] rounded-xl border border-[var(--i-line)]">
            {files.map((file) => (
              <li key={file.id} className="flex items-start gap-2.5 px-3 py-2">
                <FileText
                  size={15}
                  className="mt-0.5 shrink-0 text-[var(--i-muted)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] text-[var(--i-ink)]">
                    {file.name}
                  </span>
                  <span
                    className={cn(
                      "block text-[11.5px] leading-snug",
                      file.status === "error"
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-[var(--i-faint)]",
                    )}
                  >
                    {file.status === "reading"
                      ? "Reading…"
                      : file.status === "error"
                        ? file.message
                        : `${file.parsed?.label}: ${file.parsed?.found.join(", ")}`}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((item) => item.id !== file.id),
                    )
                  }
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--i-faint)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {drafts.length ? (
        <>
          <FormField
            id="social-import-account"
            label="Account"
            required
            help="Studio1, or a person's name for their own account."
          >
            <input
              id="social-import-account"
              type="text"
              list={listId}
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              maxLength={60}
              className={inputClass()}
            />
            <datalist id={listId}>
              {accounts.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </FormField>
          <FormField
            id="social-import-month"
            label="Month"
            required
            help={
              chosen === ALL && partly.length
                ? partly.length === 1
                  ? `${partly[0]} is only partly in the files, so it's left out. Pick it here to import it alone.`
                  : `${joinWords(partly)} are only partly in the files, so they're left out. Pick one here to import it alone.`
                : undefined
            }
          >
            <Select
              id="social-import-month"
              value={chosen ?? ""}
              onChange={(value) => setMonth(value)}
              options={[
                ...(several
                  ? [
                      {
                        value: ALL,
                        textValue: "Every whole month",
                        label: (
                          <span>
                            Every whole month
                            <span className="text-[var(--i-faint)]">
                              {" "}
                              · {monthLabel(whole[0], true)} –{" "}
                              {monthLabel(whole[whole.length - 1], true)}
                            </span>
                          </span>
                        ),
                      },
                    ]
                  : []),
                ...choices.map((choice) => ({
                  value: choice.month,
                  textValue: monthLabel(choice.month),
                  label: (
                    <span>
                      {monthLabel(choice.month)}
                      <span className="text-[var(--i-faint)]">
                        {" "}
                        ·{" "}
                        {choice.days >= choice.of
                          ? `all ${choice.of} days${choice.month === today.slice(0, 7) ? " so far" : ""}`
                          : choice.days
                            ? `${choice.days} of ${choice.of} days`
                            : "posts only"}
                      </span>
                    </span>
                  ),
                })),
              ]}
            />
          </FormField>
          {chosen === ALL
            ? platforms.map((platform) => {
                const mine = drafts.filter(
                  (draft) => draft.platform === platform,
                );
                return mine.length ? (
                  <MonthsPanel
                    key={platform}
                    platform={platform}
                    drafts={mine}
                    followersOf={followersOf}
                    loggedFor={(draft) =>
                      Boolean(loggedFor(draft.platform, draft.month))
                    }
                    onFollowers={onFollowers}
                  />
                ) : null;
              })
            : drafts.map((draft) => (
                <DraftPanel
                  key={draft.platform}
                  draft={draft}
                  followers={followersOf(draft)}
                  logged={Boolean(loggedFor(draft.platform, draft.month))}
                  onFollowers={(value) => onFollowers(draft, value)}
                />
              ))}
        </>
      ) : null}
    </FormDialog>
  );
}

/** What one platform's month will save, with its followers to check. */
function DraftPanel({
  draft,
  followers,
  logged,
  onFollowers,
}: {
  draft: MonthDraft;
  followers: string;
  /** The month is logged already, so this import adds to it. */
  logged: boolean;
  onFollowers: (value: string) => void;
}) {
  const info = platformInfo(draft.platform);
  const id = `social-import-followers-${draft.platform}`;
  const video = draft.platform === "youtube";
  const numbers: [string, string | null][] = [
    ["Impressions", grouped(draft.impressions) || null],
    // YouTube's export has no engagements column.
    ...(video && draft.engagements === null
      ? []
      : [
          ["Engagements", grouped(draft.engagements) || null] as [
            string,
            string | null,
          ],
        ]),
    [video ? "Videos" : "Posts", grouped(draft.posts) || null],
    ...(Object.entries(draft.insights.stats ?? {}) as [StatKey, number][]).map(
      ([key, value]): [string, string | null] => [
        statLabel(key, draft.platform),
        statText(key, value),
      ],
    ),
  ];
  const audience = (draft.insights.demographics ?? []).map((item) =>
    DEMOGRAPHIC_LABELS[item.kind].toLowerCase(),
  );
  const extras = [
    draft.insights.daily?.length
      ? `numbers for each of ${draft.insights.daily.length} days`
      : "",
    draft.insights.posts?.length
      ? `the ${draft.insights.posts.length === 1 ? `best ${video ? "video" : "post"}` : `${draft.insights.posts.length} best ${video ? "videos" : "posts"}`}`
      : "",
    audience.length ? `who the audience is (${audience.join(", ")})` : "",
  ].filter(Boolean);
  const followersHelp =
    draft.followers !== null
      ? draft.followersNote
      : logged && followers
        ? "Kept from what's logged for the month."
        : draft.followersNote;

  return (
    <section
      className="rounded-xl border border-[var(--i-line)] p-3.5 sm:col-span-2"
      aria-label={info.label}
    >
      <div className="flex items-center gap-2">
        <PlatformLogo platform={draft.platform} size={22} />
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {info.label}
        </p>
        <p className="text-[11.5px] text-[var(--i-faint)]">
          {draft.days
            ? `${draft.days} of ${draft.of} days`
            : "No day-by-day numbers"}
          {logged ? " · adds to the month logged" : ""}
        </p>
      </div>
      <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
        <div>
          <label
            htmlFor={id}
            className="mb-1 block text-[12px] text-[var(--i-muted)]"
          >
            {info.unit.charAt(0).toUpperCase() + info.unit.slice(1)} at month
            end
            <span className="text-[var(--i-accent-text)]"> *</span>
          </label>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            value={followers}
            onChange={(event) => onFollowers(event.target.value)}
            placeholder="1,240"
            maxLength={20}
            className={inputClass()}
          />
          {followersHelp ? (
            <p className="mt-1 text-[11.5px] leading-snug text-[var(--i-faint)]">
              {followersHelp}
            </p>
          ) : null}
        </div>
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-3 gap-y-2 text-[12px]">
          {numbers.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="truncate text-[var(--i-faint)]">{label}</dt>
              <dd className="font-medium tabular-nums text-[var(--i-ink)]">
                {value === null ? (
                  <span className="font-normal text-[var(--i-faint)]">
                    Not in the files
                  </span>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {extras.length ? (
        <p className="mt-3 text-[11.5px] text-[var(--i-muted)]">
          Also saves {joinWords(extras)}.
        </p>
      ) : null}
      {draft.notes.map((note) => (
        <p
          key={note}
          className="mt-1.5 text-[11.5px] leading-snug text-amber-700 dark:text-amber-300"
        >
          {note}
        </p>
      ))}
    </section>
  );
}

/** Every whole month for one platform: a row a month, followers to check. */
function MonthsPanel({
  platform,
  drafts,
  followersOf,
  loggedFor,
  onFollowers,
}: {
  platform: ImportPlatform;
  drafts: MonthDraft[];
  followersOf: (draft: MonthDraft) => string;
  loggedFor: (draft: MonthDraft) => boolean;
  onFollowers: (draft: MonthDraft, value: string) => void;
}) {
  const info = platformInfo(platform);
  const unit = info.unit.charAt(0).toUpperCase() + info.unit.slice(1);
  const showPosts = drafts.some((draft) => draft.posts !== null);
  const missing = drafts.some((draft) => !followersOf(draft).trim());
  const saves = [
    drafts.some((draft) => draft.insights.daily?.length)
      ? "its numbers for each day"
      : "",
    drafts.some((draft) => draft.insights.posts?.length)
      ? platform === "youtube"
        ? "its best videos"
        : "its best posts"
      : "",
  ].filter(Boolean);
  const audience = drafts.filter(
    (draft) => draft.insights.demographics?.length,
  );
  const cell = "px-2 py-2 text-right tabular-nums";
  return (
    <section
      className="rounded-xl border border-[var(--i-line)] p-3.5 sm:col-span-2"
      aria-label={info.label}
    >
      <div className="flex items-center gap-2">
        <PlatformLogo platform={platform} size={22} />
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {info.label}
        </p>
        <p className="text-[11.5px] text-[var(--i-faint)]">
          {drafts.length} months
        </p>
      </div>
      <div className="-mx-1 mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--i-line)] text-[11.5px] text-[var(--i-faint)]">
              <th
                scope="col"
                className="py-1.5 pl-1 pr-2 text-left font-normal"
              >
                Month
              </th>
              <th scope="col" className="px-2 py-1.5 text-left font-normal">
                {unit} at month end
                <span className="text-[var(--i-accent-text)]"> *</span>
              </th>
              <th scope="col" className="px-2 py-1.5 text-right font-normal">
                Impressions
              </th>
              <th
                scope="col"
                className="px-2 py-1.5 text-right font-normal max-sm:hidden"
              >
                Engagements
              </th>
              {showPosts ? (
                <th
                  scope="col"
                  className="px-2 py-1.5 text-right font-normal max-sm:hidden"
                >
                  {platform === "youtube" ? "Videos" : "Posts"}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => {
              const id = `social-import-followers-${platform}-${draft.month}`;
              const followers = followersOf(draft);
              const note =
                draft.followers !== null
                  ? draft.followersNote
                  : loggedFor(draft) && followers
                    ? "Kept from what's logged."
                    : "";
              return (
                <tr
                  key={draft.month}
                  className="border-b border-[var(--i-line)] align-top last:border-0"
                >
                  <th
                    scope="row"
                    className="whitespace-nowrap py-2 pl-1 pr-2 pt-3 text-left font-normal text-[var(--i-ink)]"
                  >
                    <label htmlFor={id}>{monthLabel(draft.month)}</label>
                  </th>
                  <td className="min-w-[9rem] px-2 py-1.5">
                    <input
                      id={id}
                      type="text"
                      inputMode="numeric"
                      value={followers}
                      onChange={(event) =>
                        onFollowers(draft, event.target.value)
                      }
                      placeholder="1,240"
                      maxLength={20}
                      className={inputClass("sm")}
                    />
                    {note ? (
                      <p className="mt-1 max-w-[16rem] text-[11px] leading-snug text-[var(--i-faint)]">
                        {note}
                      </p>
                    ) : null}
                  </td>
                  <td className={cn(cell, "pt-3")}>
                    {grouped(draft.impressions) || "—"}
                  </td>
                  <td className={cn(cell, "pt-3 max-sm:hidden")}>
                    {grouped(draft.engagements) || "—"}
                  </td>
                  {showPosts ? (
                    <td className={cn(cell, "pt-3 max-sm:hidden")}>
                      {grouped(draft.posts) || "—"}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {missing ? (
        <p className="mt-2 text-[11.5px] leading-snug text-amber-700 dark:text-amber-300">
          {platform === "x"
            ? "X's export doesn't give the total. Add the latest month's from the profile and the months before it are worked out from the net follows."
            : "This export doesn't give the total. Add each month's from the page."}
        </p>
      ) : null}
      {saves.length || audience.length ? (
        <p className="mt-2 text-[11.5px] text-[var(--i-muted)]">
          {saves.length ? `Each month also saves ${joinWords(saves)}. ` : ""}
          {audience.length
            ? `${joinWords(audience.map((draft) => monthLabel(draft.month)))} also ${audience.length === 1 ? "saves" : "save"} who the audience is.`
            : ""}
        </p>
      ) : null}
    </section>
  );
}

/** "15,417" for the follower box; "" for nothing. */
function grouped(value: number | null) {
  return value === null ? "" : counts.format(value);
}

function joinWords(words: string[]) {
  return words.length < 2
    ? words.join("")
    : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
