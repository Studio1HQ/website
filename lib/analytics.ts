/**
 * Google Analytics (GA4 property "studio1hq.com", account Studio1) with
 * Google's Consent Mode. Used by components/analytics and next.config.ts.
 *
 * Visitors in the EEA, the UK and Switzerland start with analytics cookies
 * denied (Google decides by IP), so GA only gets cookieless pings until they
 * accept the banner; everyone else is measured normally. Ad storage is denied
 * everywhere: the site runs no ads.
 */

/** The web stream for https://www.studio1hq.com. Only production loads it. */
export const GA_MEASUREMENT_ID = "G-2VTPYVBGWQ";

/** Where the visitor's choice is kept (localStorage): "granted" or "denied". */
export const CONSENT_STORAGE_KEY = "studio1-analytics-consent";

/** Fired on window when the banner should look again (a choice, or "Cookie settings"). */
export const CONSENT_CHANGE_EVENT = "studio1:consent-change";

export type ConsentChoice = "granted" | "denied";

/** EEA (EU + Iceland, Liechtenstein, Norway), the UK and Switzerland. */
export const CONSENT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
] as const; // prettier-ignore

/**
 * Time zones of those countries. The banner is shown when the browser's time
 * zone is one of them: a cheap stand-in for the IP check Google does, with
 * no request. A miss is safe either way: an EEA visitor who doesn't see the
 * banner stays at "denied"; anyone else who sees it was already counted.
 */
const CONSENT_TIME_ZONES = new Set([
  "Europe/Vienna", "Europe/Brussels", "Europe/Sofia", "Europe/Zagreb",
  "Asia/Nicosia", "Asia/Famagusta", "Europe/Nicosia", "Europe/Prague",
  "Europe/Copenhagen", "Europe/Tallinn", "Europe/Helsinki", "Europe/Mariehamn",
  "Europe/Paris", "Europe/Berlin", "Europe/Busingen", "Europe/Athens",
  "Europe/Budapest", "Europe/Dublin", "Europe/Rome", "Europe/Riga",
  "Europe/Vilnius", "Europe/Luxembourg", "Europe/Malta", "Europe/Amsterdam",
  "Europe/Warsaw", "Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores",
  "Europe/Bucharest", "Europe/Bratislava", "Europe/Ljubljana", "Europe/Madrid",
  "Africa/Ceuta", "Atlantic/Canary", "Europe/Stockholm", "Atlantic/Reykjavik",
  "Europe/Vaduz", "Europe/Oslo", "Arctic/Longyearbyen", "Europe/London",
  "Europe/Belfast", "Europe/Jersey", "Europe/Guernsey", "Europe/Isle_of_Man",
  "Europe/Gibraltar", "Europe/Zurich",
]); // prettier-ignore

/** Whether a visitor in this time zone should be asked before analytics cookies. */
export function needsConsentBanner(timeZone: string | undefined) {
  return Boolean(timeZone && CONSENT_TIME_ZONES.has(timeZone));
}

/** A stored choice, or null when there's none (or it's unreadable). */
export function readConsent(
  value: string | null | undefined,
): ConsentChoice | null {
  return value === "granted" || value === "denied" ? value : null;
}

/**
 * The inline script that starts GA. Order matters: consent defaults, then the
 * visitor's saved choice, then config, and only then gtag.js, so no hit is
 * ever sent before consent is known.
 */
export function gaInitScript(measurementId: string) {
  const id = JSON.stringify(measurementId);
  const regions = JSON.stringify(CONSENT_REGIONS);
  const key = JSON.stringify(CONSENT_STORAGE_KEY);
  return `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
var ads={ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"};
gtag("consent","default",Object.assign({analytics_storage:"denied",region:${regions}},ads));
gtag("consent","default",Object.assign({analytics_storage:"granted"},ads));
try{var c=localStorage.getItem(${key});if(c==="granted"||c==="denied")gtag("consent","update",{analytics_storage:c});}catch(e){}
gtag("js",new Date());
gtag("config",${id});
var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(${id});document.head.appendChild(s);`;
}
