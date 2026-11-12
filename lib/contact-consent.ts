/**
 * The consent block every form ends with: two required ticks, one to store
 * the entry and email about it, one to subscribe to Studio1's email updates
 * (unsubscribing later never affects the application). Shared by the forms
 * (client) and their API routes (server), so both enforce it.
 */

export type ContactConsentValues = {
  /** Required: Studio1 may store these details and email about next steps. */
  contactConsent: boolean;
  /** Required: subscribes to emails about new roles, cohorts and events. */
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
  emailUpdates?: string;
} {
  return {
    ...(values.contactConsent
      ? {}
      : {
          contactConsent:
            "Tick this so we can keep your details and email you about next steps.",
        }),
    ...(values.emailUpdates
      ? {}
      : {
          emailUpdates:
            "Tick this to continue. Signing up includes our email updates, and you can unsubscribe at any time.",
        }),
  };
}
