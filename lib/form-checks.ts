/**
 * Field checks shared by every form (careers, DevRel Cohort, hackathons),
 * on the client and in the API routes. They catch the usual mix-ups, like a
 * website pasted into the name field, with a message that says what to fix.
 */

/** A link or a bare domain: https://…, www.…, or a token like boringmonkee.com. */
export function looksLikeLink(value: string) {
  return (
    /[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
    /(^|\s)www\./i.test(value) ||
    /[\p{L}\p{N}-]{2,}\.[a-z]{2,}(?=$|[\s/?#:])/iu.test(value)
  );
}

function letters(value: string) {
  return (value.match(/\p{L}/gu) ?? []).length;
}

/**
 * A person's name in any script: letters, spaces, hyphens, apostrophes and
 * full stops (for initials). No links, email addresses or digits.
 */
export function nameError(value: string): string | undefined {
  if (value.length < 2 || value.length > 80 || letters(value) < 2) {
    return "Enter your full name.";
  }
  if (value.includes("@")) return "Enter your name here, not an email address.";
  if (looksLikeLink(value)) {
    return "Enter your name here, not a link. Links go in the fields below.";
  }
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(value)) {
    return "Use letters only, like Priya Sharma.";
  }
  return undefined;
}

/** A city and/or country: letters required; digits and simple punctuation are fine. */
export function placeError(
  value: string,
  message: string,
  max = 80,
): string | undefined {
  if (value.length < 2 || value.length > max || letters(value) < 2) return message;
  if (value.includes("@") || looksLikeLink(value)) {
    return `${message.replace(/\.$/, "")}, not a link or email address.`;
  }
  if (!/^[\p{L}\p{M}\p{N} .,'’()/&-]+$/u.test(value)) return message;
  return undefined;
}
