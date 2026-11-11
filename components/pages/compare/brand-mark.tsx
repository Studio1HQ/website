"use client";

import Logo from "@/components/ui/svgs/logo";
import { PrintBlock } from "@/components/paper/paper-hero";
import { cn } from "@/lib/utils";

/** Anchor id for an agency or competitor ("Draft.dev" -> "draft-dev"). */
export function brandId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Square brand tile: Studio1's mark printed on orange, anyone else as an ink
 * monogram (their own logos are theirs to use, not ours).
 */
export function BrandMark({
  name,
  ours = false,
  size = 40,
  className,
}: {
  name: string;
  ours?: boolean;
  size?: number;
  className?: string;
}) {
  if (ours) {
    return (
      <PrintBlock
        className={cn("flex shrink-0 items-center justify-center", className)}
      >
        <span
          className="flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <Logo className="size-[58%] brightness-0 invert" />
        </span>
      </PrintBlock>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-[#141414] font-medium tracking-[-0.04em] text-[#f4efe7]",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.46 }}
    >
      {name.charAt(0)}
    </span>
  );
}
