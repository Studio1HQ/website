import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PencilSimple, Plus } from "@/components/internal/icons";
import {
  removeChannel,
  removeInfluencer,
  removePost,
  removeRate,
  saveChannel,
  saveInfluencer,
  savePost,
  saveRate,
} from "@/app/internal/(dashboard)/influencers/actions";
import {
  formatDay,
  formatMoney,
  formatTotals,
  sumMoney,
  todayKey,
} from "@/lib/internal/community/schema";
import {
  getInfluencer,
  loadChannels,
  loadPosts,
  loadRates,
  ownerChoices,
  requireInfluencers,
} from "@/lib/internal/influencers/data";
import {
  bestChannel,
  bestValue,
  byValue,
  engagementRate,
  engagements,
  formatCount,
  formatPercent,
  isSpiky,
  opensPerIssue,
  per1k,
  rateLines,
  reachRate,
  totalFollowers,
  typicalViews,
} from "@/lib/internal/influencers/rules";
import {
  CHANNEL_FIELDS,
  INFLUENCERS_MIGRATION_HINT,
  INFLUENCER_FIELDS,
  PLATFORMS,
  POST_FIELDS,
  RATE_FIELDS,
  STATUSES,
  formatLabel,
  formatName,
  nicheLabel,
  platformLabel,
  type Channel,
} from "@/lib/internal/influencers/schema";
import {
  Card,
  CardTitle,
  ExternalLink,
  Field,
  Fields,
  Notice,
  PageHeader,
  TagChip,
  buttonClass,
} from "@/components/internal/ui";
import {
  Muted,
  OptionPill,
  Owner,
  Stat,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import {
  NicheChips,
  PATH,
  Per1k,
  PlatformPill,
} from "@/components/internal/influencers/ui";
import { FieldDialog } from "@/components/internal/outreach/field-dialog";
import { SiteLogo } from "@/components/internal/site-logo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  // The title is data too: check who's asking before reading the record.
  const [, { id }] = await Promise.all([requireInfluencers(), params]);
  const influencer = await getInfluencer(id);
  return {
    title:
      influencer && influencer !== "error" ? influencer.name : "Influencers",
  };
}

/**
 * The numbers a channel card shows, as [label, figure, what it means]. A
 * newsletter has subscribers, opens and clicks; other platforms have the
 * typical, average and best post, and engagement.
 */
function channelFigures(channel: Channel): [string, string, string?][] {
  const posts = channel.posts_per_month === null ? "—" : String(channel.posts_per_month);
  if (channel.platform === "newsletter") {
    return [
      ["Subscribers", formatCount(channel.followers)],
      ["Open rate", formatPercent(channel.open_rate), "Subscribers who open an issue"],
      ["Click rate", formatPercent(channel.click_rate), "Subscribers who click a link in an issue"],
      ["Opens an issue", formatCount(opensPerIssue(channel)), "Subscribers × open rate"],
      ["Issues a month", posts],
    ];
  }
  return [
    ["Followers", formatCount(channel.followers)],
    ["Typical views", formatCount(channel.median_views), "The median post: what a usual post gets"],
    ["Average views", formatCount(channel.avg_views), "The mean: a few viral posts can lift it"],
    ["Best lately", formatCount(channel.best_views), "Their biggest post of the last few months"],
    ["Engagement", formatPercent(engagementRate(channel)), "Engagements for every 100 views"],
    ["Reaches", formatPercent(reachRate(channel)), "A typical post's views over their followers"],
    ["Engagements", formatCount(channel.avg_engagements), "Likes, comments, reposts and saves on a usual post"],
    ["Posts a month", posts],
  ];
}

const editClass =
  "inline-flex size-7 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]";

function AddButton({ children }: { children: string }) {
  return (
    <button type="button" className={buttonClass("secondary", "sm")}>
      <Plus size={13} /> {children}
    </button>
  );
}

export default async function InfluencerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [, { id }] = await Promise.all([requireInfluencers(), params]);
  const influencer = await getInfluencer(id);
  if (influencer === "error")
    return <Notice tone="warning">{INFLUENCERS_MIGRATION_HINT}</Notice>;
  if (!influencer) notFound();
  const [channels, rates, posts, owners] = await Promise.all([
    loadChannels(influencer.id),
    loadRates(influencer.id),
    loadPosts(influencer.id),
    ownerChoices(),
  ]);
  const today = todayKey();
  const own = channels.ok ? channels.rows : [];
  const lines = rateLines(rates.ok ? rates.rows : [], own).sort(
    (a, b) =>
      PLATFORMS.findIndex((item) => item.value === a.platform) -
        PLATFORMS.findIndex((item) => item.value === b.platform) ||
      byValue(a, b),
  );
  const posted = posts.ok ? posts.rows : [];
  const top = bestChannel(own);
  const topViews = top ? typicalViews(top) : null;
  // A newsletter on its own: subscribers, not followers across platforms.
  const onlyNewsletter = own.length === 1 && own[0].platform === "newsletter";
  const value = bestValue(lines);
  const spent = sumMoney(
    posted.map((post) => ({ amount: post.cost, currency: post.currency })),
  );
  const views = posted.reduce((sum, post) => sum + (post.views ?? 0), 0);
  // The platforms they don't have a channel for yet, for the next one added.
  const free = PLATFORMS.find(
    (platform) => !own.some((channel) => channel.platform === platform.value),
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href={PATH}
            className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]"
          >
            <ArrowLeft size={13} /> Influencers
          </Link>
        }
        title={influencer.name}
        description={[
          influencer.niches.map(nicheLabel).join(", "),
          influencer.location,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <OptionPill list={STATUSES} value={influencer.status} />
            <FieldDialog
              fields={INFLUENCER_FIELDS}
              noun="influencer"
              record={influencer}
              owners={owners}
              save={saveInfluencer.bind(null, influencer.id)}
              remove={removeInfluencer.bind(null, influencer.id)}
              deleteNote="Their channels, rate card and every post logged here go with them."
              deletedHref={PATH}
              trigger={
                <button type="button" className={buttonClass("primary")}>
                  <PencilSimple size={14} /> Edit
                </button>
              }
            />
          </>
        }
      />

      {influencer.status === "avoid" ? (
        <div className="mb-5">
          <Notice tone="warning">
            Marked <span className="font-medium">Don&apos;t use</span>. Read the
            notes before booking them again.
          </Notice>
        </div>
      ) : null}
      {!channels.ok || !rates.ok || !posts.ok ? (
        <div className="mb-5">
          <Notice tone="warning">
            Some of this page couldn&apos;t be loaded, so channels, prices or
            posts may be missing. Reload in a minute.
          </Notice>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={onlyNewsletter ? "Subscribers" : "Followers, added up"}
          value={own.length ? formatCount(totalFollowers(own)) : "—"}
          note={
            onlyNewsletter
              ? `${formatPercent(own[0].open_rate)} open · ${formatPercent(own[0].click_rate)} click`
              : own.length
                ? `Across ${own.length} ${own.length === 1 ? "platform" : "platforms"}; some follow on more than one`
                : "Add a channel to start"
          }
        />
        <Stat
          label="Strongest platform"
          value={topViews !== null && top ? platformLabel(top.platform) : "—"}
          note={
            topViews !== null && top
              ? `${formatCount(topViews)} ${top.platform === "newsletter" ? "opens an issue" : "views on a typical post"}`
              : "Needs what a typical post gets"
          }
        />
        <Stat
          label="Best value"
          value={value ? formatMoney(value.per1k, value.currency) : "—"}
          note={
            value
              ? `For 1k ${value.platform === "newsletter" ? "opens" : "views"}: ${formatName(value.format)}`
              : "Needs a price and what a typical post gets"
          }
        />
        <Stat
          label="Paid so far"
          value={formatTotals(spent, "—")}
          note={
            posted.length
              ? `${posted.length} ${posted.length === 1 ? "post" : "posts"} · ${formatCount(views)} views`
              : "Nothing posted for us yet"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardTitle
              action={
                <FieldDialog
                  fields={RATE_FIELDS}
                  noun="price"
                  defaults={{
                    currency: lines[0]?.currency ?? "USD",
                    quoted_on: today,
                  }}
                  save={saveRate.bind(null, influencer.id, null)}
                  trigger={<AddButton>Price</AddButton>}
                />
              }
            >
              Rate card
            </CardTitle>
            {lines.length ? (
              <Table
                head={
                  <>
                    <th>What for</th>
                    <th className="text-right">Price</th>
                    <th className="text-right" title="Views for a post, opens for a newsletter">
                      Per 1k views
                    </th>
                    <th>Quoted</th>
                    <th>Covers</th>
                    {/* A label, not hidden text: absolutely placed text would widen the page on phones. */}
                    <th aria-label="Edit" />
                  </>
                }
              >
                {lines.map((line) => (
                  <tr key={line.id} className={rowClass}>
                    <td className="whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <PlatformPill platform={line.platform} />
                        <span className="font-medium">
                          {formatLabel(line.format)}
                        </span>
                      </span>
                    </td>
                    <td className="text-right font-medium tabular-nums">
                      {formatMoney(line.price, line.currency)}
                    </td>
                    <td className="text-right">
                      <Per1k value={line.per1k} currency={line.currency} />
                    </td>
                    <td className="whitespace-nowrap text-[var(--i-muted)]">
                      {line.quoted_on ? formatDay(line.quoted_on, today) : "—"}
                    </td>
                    <td className="max-w-[14rem]">
                      {line.details ? (
                        <span className="line-clamp-2">{line.details}</span>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </td>
                    <td className="text-right">
                      <FieldDialog
                        fields={RATE_FIELDS}
                        noun="price"
                        record={line}
                        save={saveRate.bind(null, influencer.id, line.id)}
                        remove={removeRate.bind(null, influencer.id, line.id)}
                        trigger={
                          <button
                            type="button"
                            className={editClass}
                            aria-label={`Edit the ${formatName(line.format)} price`}
                          >
                            <PencilSimple size={14} />
                          </button>
                        }
                      />
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
                No prices yet. Add what they charge for each thing: a post, a
                quote tweet, a retweet, a comment, a sponsored video or a
                sponsored section.
              </p>
            )}
          </Card>

          <Card>
            <CardTitle
              action={
                <FieldDialog
                  fields={POST_FIELDS}
                  noun="post"
                  defaults={{
                    currency: lines[0]?.currency ?? "USD",
                    posted_on: today,
                  }}
                  save={savePost.bind(null, influencer.id, null)}
                  trigger={<AddButton>Log a post</AddButton>}
                />
              }
            >
              Posted for us
            </CardTitle>
            {posted.length ? (
              <Table
                head={
                  <>
                    <th>Post</th>
                    <th>For</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Views</th>
                    <th className="text-right">Per 1k views</th>
                    <th className="text-right">Engagements</th>
                    <th className="text-right">Clicks</th>
                    {/* A label, not hidden text: absolutely placed text would widen the page on phones. */}
                    <th aria-label="Edit" />
                  </>
                }
              >
                {posted.map((post) => {
                  const engaged = engagements(post);
                  return (
                    <tr key={post.id} className={rowClass}>
                      <td className="whitespace-nowrap">
                        <span className="block font-medium">
                          {formatName(post.format)}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-[var(--i-muted)]">
                          {formatDay(post.posted_on, today)}
                          {post.url ? (
                            <>
                              {" · "}
                              <ExternalLink
                                href={post.url}
                                className="text-[12px]"
                              >
                                Open
                              </ExternalLink>
                            </>
                          ) : null}
                        </span>
                      </td>
                      <td className="max-w-[12rem]">
                        {post.campaign ? (
                          <span className="line-clamp-2">{post.campaign}</span>
                        ) : (
                          <Muted>—</Muted>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {post.cost ? (
                          formatMoney(post.cost, post.currency)
                        ) : (
                          <Muted>Free</Muted>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {post.views === null ? (
                          <Muted>—</Muted>
                        ) : (
                          formatCount(post.views)
                        )}
                      </td>
                      <td className="text-right">
                        <Per1k
                          value={per1k(post.cost, post.views)}
                          currency={post.currency}
                        />
                      </td>
                      <td className="text-right tabular-nums">
                        {engaged === null ? (
                          <Muted>—</Muted>
                        ) : (
                          formatCount(engaged)
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {post.clicks === null ? (
                          <Muted>—</Muted>
                        ) : (
                          formatCount(post.clicks)
                        )}
                      </td>
                      <td className="text-right">
                        <FieldDialog
                          fields={POST_FIELDS}
                          noun="post"
                          record={post}
                          save={savePost.bind(null, influencer.id, post.id)}
                          remove={removePost.bind(null, influencer.id, post.id)}
                          trigger={
                            <button
                              type="button"
                              className={editClass}
                              aria-label={`Edit the ${formatName(post.format)} post`}
                            >
                              <PencilSimple size={14} />
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
                Nothing logged yet. When they post for you, log it with what you
                paid and what it got; come back a week later to fill in the
                views.
              </p>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardTitle
              action={
                free ? (
                  <FieldDialog
                    fields={CHANNEL_FIELDS}
                    noun="channel"
                    defaults={{ platform: free.value, checked_on: today }}
                    save={saveChannel.bind(null, influencer.id, null)}
                    trigger={<AddButton>Channel</AddButton>}
                  />
                ) : null
              }
            >
              Channels
            </CardTitle>
            {own.length ? (
              <ul className="divide-y divide-[var(--i-line)]">
                {own.map((channel) => (
                  <li key={channel.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        {channel.platform === "newsletter" && channel.url ? (
                          <SiteLogo
                            path={`${PATH}/channels/${channel.id}/logo`}
                            name={channel.handle || influencer.name}
                            website={channel.url}
                            size={22}
                          />
                        ) : null}
                        <PlatformPill platform={channel.platform} />
                        {channel.url ? (
                          <ExternalLink
                            href={channel.url}
                            className="truncate text-[13px]"
                          >
                            {channel.handle || undefined}
                          </ExternalLink>
                        ) : (
                          <span className="truncate text-[13px]">
                            {channel.handle}
                          </span>
                        )}
                      </span>
                      <FieldDialog
                        fields={CHANNEL_FIELDS}
                        noun="channel"
                        record={channel}
                        save={saveChannel.bind(null, influencer.id, channel.id)}
                        remove={removeChannel.bind(
                          null,
                          influencer.id,
                          channel.id,
                        )}
                        trigger={
                          <button
                            type="button"
                            className={editClass}
                            aria-label={`Edit the ${platformLabel(channel.platform)} channel`}
                          >
                            <PencilSimple size={14} />
                          </button>
                        }
                      />
                    </div>
                    <dl className="mt-2.5 grid grid-cols-3 gap-x-2 gap-y-2.5 text-[12px]">
                      {channelFigures(channel).map(([label, figure, hint]) => (
                        <div key={label} className="min-w-0" title={hint}>
                          <dt className="truncate text-[var(--i-faint)]">
                            {label}
                          </dt>
                          <dd className="mt-0.5 text-[13.5px] font-medium tabular-nums">
                            {figure}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {isSpiky(channel) ? (
                      <p className="mt-2 text-[12px] text-amber-700 dark:text-amber-300">
                        Spiky: the average is{" "}
                        {Math.round(((channel.avg_views ?? 0) / (channel.median_views ?? 1)) * 10) / 10}× the typical
                        post, so a few viral posts carry it. Plan on the typical figure.
                      </p>
                    ) : null}
                    {channel.checked_on || channel.notes ? (
                      <p className="mt-1.5 line-clamp-2 text-[12px] text-[var(--i-muted)]">
                        {[
                          channel.checked_on
                            ? `Checked ${formatDay(channel.checked_on, today)}`
                            : null,
                          channel.notes,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
                No channels yet. Add each platform they post on, with followers
                and the views a usual post gets.
              </p>
            )}
          </Card>

          <Card>
            <CardTitle>Details</CardTitle>
            <div className="px-5 py-4">
              <Fields>
                <Field label="Owner">
                  {influencer.owner ? <Owner owner={influencer.owner} /> : null}
                </Field>
                <Field label="Based in">{influencer.location}</Field>
                <Field label="Email" wide>
                  {influencer.email ? (
                    <a
                      href={`mailto:${influencer.email}`}
                      className="hover:text-[var(--i-accent-text)]"
                    >
                      {influencer.email}
                    </a>
                  ) : null}
                </Field>
                <Field label="Best way to reach them" wide>
                  {influencer.contact_via}
                </Field>
                <Field label="Niche" wide>
                  {influencer.niches.length ? (
                    <NicheChips niches={influencer.niches} />
                  ) : null}
                </Field>
                <Field label="Posts about" wide>
                  {influencer.topics}
                </Field>
                <Field label="Who follows them" wide>
                  {influencer.audience}
                </Field>
                <Field label="Posts in">{influencer.languages}</Field>
                <Field label="Style">{influencer.content_style}</Field>
                {influencer.tags.length ? (
                  <Field label="Tags" wide>
                    <span className="flex flex-wrap gap-1">
                      {influencer.tags.map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </span>
                  </Field>
                ) : null}
                {influencer.notes ? (
                  <Field label="Notes" wide>
                    <span className="whitespace-pre-wrap">
                      {influencer.notes}
                    </span>
                  </Field>
                ) : null}
              </Fields>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
