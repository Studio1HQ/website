import type { StaticImageData } from "next/image";

/**
 * White, transparent versions of logos whose source files carry a solid
 * background; a CSS filter would turn those into white blocks.
 */
export const WHITE_LOGOS: Record<string, string> = {
  Nebius: "/assets/logos-white/nebius.webp",
  Velt: "/assets/logos-white/velt.webp",
  CodeRabbit: "/assets/logos-white/coderabbit.webp",
  LiteLLM: "/assets/logos-white/litellm.webp",
  Jozu: "/assets/logos-white/jozu.webp",
};

/** Source and filter that render a client logo solid white on dark/brand surfaces. */
export function whiteLogo(item: { name: string; image: StaticImageData | string }) {
  const whiteSrc = WHITE_LOGOS[item.name];
  return whiteSrc
    ? { src: whiteSrc, filter: undefined }
    : { src: item.image, filter: "brightness-0 invert" };
}
