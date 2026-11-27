import { LocaleFlag } from "@/components/localization/locale-flag";
import { MAP_FLAGS } from "@/components/ui/map-flags";
import { cn } from "@/lib/utils";

/**
 * Round flag for a reach country (India comes from the locale flags). Its own
 * module, apart from the world map, so the homepage's country list can show
 * flags without loading the map and its data (data/world-reach.json).
 */
export function CountryFlag({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  if (country === "India")
    return <LocaleFlag locale="hi" className={cn("size-4", className)} />;
  const flag = MAP_FLAGS[country];
  if (!flag) return null;
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden
      className={cn(
        "size-4 shrink-0 rounded-full ring-1 ring-black/10",
        className,
      )}
    >
      {flag}
    </svg>
  );
}
