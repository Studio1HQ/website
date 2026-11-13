import { looksLikeLink } from "./form-checks";

/** Titles people type before their name; never the name to greet them by. */
const TITLES = new Set([
  "mr", "mrs", "ms", "miss", "mx", "dr", "prof", "professor", "sir", "madam",
  "er", "shri", "sri", "smt", "kumari", "km", "ca", "adv", "capt", "col",
]);

/** Fixes all-lower or ALL-CAPS words; leaves mixed case (McKenzie) and caseless scripts alone. */
function tidyCase(word: string) {
  const lower = word.toLocaleLowerCase();
  const upper = word.toLocaleUpperCase();
  if (lower === upper) return word;
  const cased =
    word === lower || word === upper
      ? lower.replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, char: string) => sep + char.toLocaleUpperCase())
      : word;
  return cased.charAt(0).toLocaleUpperCase() + cased.slice(1);
}

/**
 * The name to greet someone by ("Hi Priya,"), from what they typed as their
 * full name. Skips titles and lone initials, so "Dr. Priya Sharma" and
 * "K. Ramesh" become "Priya" and "Ramesh"; fixes "DEEP BHAGAT" to "Deep";
 * keeps "Anne-Marie", "McKenzie", "李明" and "अरिंदम" as they are. Falls back
 * to "there" for links, email addresses or nothing usable.
 */
export function firstName(fullName: string) {
  const name = fullName.normalize("NFC").trim();
  if (!name || name.includes("@") || looksLikeLink(name)) return "there";
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{M}'’-]/gu, ""))
    .filter((word) => /\p{L}/u.test(word));
  const isTitle = (word: string) => TITLES.has(word.toLowerCase());
  const isInitial = (word: string) => (word.match(/\p{L}/gu) ?? []).length === 1;
  const pick =
    words.find((word) => !isTitle(word) && !isInitial(word)) ??
    words.find((word) => !isTitle(word));
  return pick ? tidyCase(pick).slice(0, 40) : "there";
}
