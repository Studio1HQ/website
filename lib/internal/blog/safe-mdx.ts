import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import { SAFE_TAGS, roughHtml } from "@/lib/internal/blog/shared";

/**
 * Posts never carry raw HTML or MDX code: no tags or components (except a
 * few harmless inline tags, without attributes), no import, export or
 * {expression}. One rule, used in three places:
 *
 *   findUnsafeMdx   reads a post the way the site does and lists what breaks
 *                   the rule. Saving refuses tags and components; publishing
 *                   refuses everything on the list, so the file committed
 *                   to the site has none.
 *   remarkSafeMdx   drops the same things while rendering, for the preview
 *                   and the live blog page, in case an older post has any.
 *
 * The blog writes three components itself (components/blog/mdx.tsx turns a
 * FAQ chapter and YouTube links into them). Those pass when `generated` is
 * on, with only the attributes below.
 */

type Attribute = { type: string; name?: string; value?: unknown };
type Node = { type: string; name?: string | null; attributes?: Attribute[]; children?: Node[] };

const CODE = new Set(["mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"]);
const JSX = new Set(["mdxJsxFlowElement", "mdxJsxTextElement"]);

export const YOUTUBE_EMBED = /^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{6,}$/;

/** The blog's own components, and the text attributes each may keep. */
const GENERATED: Record<string, Record<string, (value: string) => boolean>> = {
  BlogFaq: {},
  BlogFaqItem: { question: () => true },
  YouTubeEmbed: { url: (value) => YOUTUBE_EMBED.test(value) },
};

export type UnsafeMdx = {
  /** "tag" is HTML or a component; "code" is {…}, import or export. */
  kind: "tag" | "code";
  /** For messages: "<script>", "{ } code", "import/export". */
  label: string;
};

/** What's wrong with this node, or null when it may stay. */
function problem(node: Node, generated: boolean): UnsafeMdx | null {
  if (node.type === "html") return { kind: "tag", label: "HTML" };
  if (CODE.has(node.type)) {
    return { kind: "code", label: node.type === "mdxjsEsm" ? "import/export" : "{ } code" };
  }
  if (!JSX.has(node.type)) return null;
  const name = node.name ?? "";
  if (generated && Object.hasOwn(GENERATED, name)) return null;
  if (SAFE_TAGS.has(name) && !node.attributes?.length) return null;
  return { kind: "tag", label: `<${name}>` };
}

/** Keeps only the attributes a generated component may have, as plain text. */
function cleanAttributes(node: Node) {
  const allowed = GENERATED[node.name ?? ""] ?? {};
  node.attributes = (node.attributes ?? []).filter(
    (attribute) =>
      attribute.type === "mdxJsxAttribute" &&
      typeof attribute.name === "string" &&
      typeof attribute.value === "string" &&
      Object.hasOwn(allowed, attribute.name) &&
      allowed[attribute.name](attribute.value),
  );
}

/**
 * Remark plugin: drops what the rule forbids. A harmless tag that came with
 * attributes stays, without them. Use `[remarkSafeMdx, { generated: true }]`
 * after transformBlogMdxContent, so the FAQ and YouTube embeds survive.
 */
export function remarkSafeMdx(options: { generated?: boolean } = {}) {
  const generated = options.generated === true;
  return (tree: Node) => {
    const walk = (node: Node) => {
      if (!node.children) return;
      node.children = node.children.filter((child) => {
        if (JSX.has(child.type) && SAFE_TAGS.has(child.name ?? "")) child.attributes = [];
        else if (problem(child, generated)) return false;
        else if (JSX.has(child.type)) cleanAttributes(child);
        walk(child);
        return true;
      });
    };
    walk(tree);
  };
}

/**
 * Everything in a post's text that breaks the rule. `parsed` is false when
 * the site can't read the text at all (a stray { or <, say): such a post
 * can't be published anyway, and a quick look for tags stands in.
 */
export async function findUnsafeMdx(source: string): Promise<{ parsed: boolean; found: UnsafeMdx[] }> {
  const found: UnsafeMdx[] = [];
  const record = () => (tree: Node) => {
    const walk = (node: Node) => {
      for (const child of node.children ?? []) {
        const issue = problem(child, false);
        if (issue) found.push(issue);
        walk(child);
      }
    };
    walk(tree);
  };
  try {
    await serialize(source, { mdxOptions: { remarkPlugins: [remarkGfm, record] } });
    return { parsed: true, found };
  } catch {
    return { parsed: false, found: roughHtml(source).map((label) => ({ kind: "tag" as const, label })) };
  }
}

/** Why a post's text can't be saved, or null when it can. */
export async function bodyProblem(body: string): Promise<string | null> {
  if (!/[<{]/.test(body)) return null;
  const { found } = await findUnsafeMdx(body);
  const tag = found.find((issue) => issue.kind === "tag");
  return tag
    ? `Raw HTML isn't allowed in posts (${tag.label}). Take it out, or put it in a code block, and it will save.`
    : null;
}
