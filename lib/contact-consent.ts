/**
 * The consent block every form ends with: a required tick to store the
 * entry and email about it, and an optional opt-in to future emails.
 * Shared by the forms (client) and their API routes (server).
 */

export type ContactConsentValues = {
  /** Required: Studio1 may store these details and email about next steps. */
  contactConsent: boolean;
  /** Optional: occasional emails about future roles, cohorts and events. */
  emailUpdates: boolean;
};

export const EMPTY_CONSENT: ContactConsentValues = {
  contactConsent: false,
  emailUpdates: false,
};

/** JSON sends booleans; FormData sends "true" (or "on" from a native box). */
const flag = (value: unknown) =>
  value === true || value === "true" || value === "on";

export function readConsent(input: {
  contactConsent?: unknown;
  emailUpdates?: unknown;
}): ContactConsentValues {
  return {
    contactConsent: flag(input.contactConsent),
    emailUpdates: flag(input.emailUpdates),
  };
}

export function consentErrors(values: ContactConsentValues): {
  contactConsent?: string;
} {
  return values.contactConsent
    ? {}
    : {
        contactConsent:
          "Tick this so we can keep your details and email you about next steps.",
      };
}
