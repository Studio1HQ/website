/**
 * Drafts are written by people outside the team too, so the dashboard never
 * renders a draft's raw HTML or MDX code: this remark plugin drops JSX/HTML
 * elements (except a few harmless inline tags, without attributes) and any
 * import, export or {expression}. The preview and the pre-publish compile
 * use it; postChecks (shared.ts) blocks publishing a post that has raw HTML,
 * so the live site never gets any either.
 */

export const SAFE_TAGS = new Set(["br", "sup", "sub", "kbd"]);

type Node = { type: string; name?: string | null; attributes?: unknown[]; children?: Node[] };

const CODE = new Set(["mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"]);
const JSX = new Set(["mdxJsxFlowElement", "mdxJsxTextElement"]);

export function remarkSafeMdx() {
  return (tree: Node) => {
    const walk = (node: Node) => {
      if (!node.children) return;
      node.children = node.children.filter((child) => {
        if (CODE.has(child.type)) return false;
        if (JSX.has(child.type)) {
          if (!child.name || !SAFE_TAGS.has(child.name)) return false;
          child.attributes = [];
        }
        walk(child);
        return true;
      });
    };
    walk(tree);
  };
}
