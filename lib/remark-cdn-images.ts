import { LARGEST_WIDTH, imageUrl } from "@/lib/image-url";

type Attribute = { type: string; name?: string; value?: unknown };
type Node = {
  type: string;
  name?: string | null;
  attributes?: Attribute[];
  children?: Node[];
};

const JSX = new Set(["mdxJsxFlowElement", "mdxJsxTextElement"]);

/**
 * Points <img> tags written as JSX in MDX at the CDN. Markdown images
 * (![alt](src)) go through the page's `img` component, but MDX leaves JSX
 * tags like <img src="..." /> as they are, so their src is swapped here.
 * Same file as the component uses: the largest width, which is the image's
 * own size up to 1920px, so the image shows at the same size as before.
 */
export function remarkCdnImages() {
  return (tree: Node) => {
    const walk = (node: Node) => {
      if (JSX.has(node.type) && node.name === "img") {
        for (const attribute of node.attributes ?? []) {
          if (
            attribute.type === "mdxJsxAttribute" &&
            attribute.name === "src" &&
            typeof attribute.value === "string"
          )
            attribute.value = imageUrl({
              src: attribute.value,
              width: LARGEST_WIDTH,
            });
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
