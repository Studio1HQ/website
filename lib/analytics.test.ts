import { Script } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  CONSENT_REGIONS,
  GA_MEASUREMENT_ID,
  gaInitScript,
  needsConsentBanner,
  readConsent,
} from "./analytics";

describe("needsConsentBanner", () => {
  it("asks visitors in the EEA, the UK and Switzerland", () => {
    for (const zone of [
      "Europe/Paris",
      "Europe/Madrid",
      "Atlantic/Canary",
      "Europe/London",
      "Europe/Zurich",
      "Europe/Oslo",
      "Asia/Nicosia",
    ])
      expect(needsConsentBanner(zone), zone).toBe(true);
  });

  it("doesn't ask anyone else", () => {
    for (const zone of [
      "Asia/Kolkata",
      "America/New_York",
      "America/Los_Angeles",
      "Europe/Moscow",
      "Europe/Istanbul",
      "Europe/Kyiv",
      "Asia/Singapore",
      undefined,
      "",
    ])
      expect(needsConsentBanner(zone), String(zone)).toBe(false);
  });
});

describe("readConsent", () => {
  it("accepts only a real choice", () => {
    expect(readConsent("granted")).toBe("granted");
    expect(readConsent("denied")).toBe("denied");
    expect(readConsent("yes")).toBeNull();
    expect(readConsent(null)).toBeNull();
    expect(readConsent(undefined)).toBeNull();
  });
});

describe("gaInitScript", () => {
  const script = gaInitScript(GA_MEASUREMENT_ID);

  it("sets consent before config, and loads gtag.js last", () => {
    const regionDefault = script.indexOf('analytics_storage:"denied",region');
    const elsewhere = script.indexOf('analytics_storage:"granted"');
    const saved = script.indexOf("localStorage.getItem");
    const config = script.indexOf('gtag("config"');
    const load = script.indexOf("googletagmanager.com/gtag/js");
    expect(regionDefault).toBeGreaterThan(-1);
    expect(regionDefault).toBeLessThan(elsewhere);
    expect(elsewhere).toBeLessThan(saved);
    expect(saved).toBeLessThan(config);
    expect(config).toBeLessThan(load);
  });

  it("loads gtag.js straight away on wider screens, after the page on phones", () => {
    const phones = script.indexOf('matchMedia("(max-width: 767px)")');
    const afterLoad = script.indexOf('addEventListener("load"');
    expect(phones).toBeGreaterThan(script.indexOf('gtag("config"'));
    expect(afterLoad).toBeGreaterThan(phones);
    expect(script).toMatch(/\}else load\(\);$/);
  });

  it("denies ad storage everywhere and lists every consent region", () => {
    expect(script).toContain('ad_storage:"denied"');
    expect(script).toContain('ad_user_data:"denied"');
    expect(script).toContain('ad_personalization:"denied"');
    for (const region of CONSENT_REGIONS)
      expect(script).toContain(`"${region}"`);
    expect(CONSENT_REGIONS).toHaveLength(32);
  });

  it("is valid JavaScript with the ID quoted", () => {
    // Compiles only; nothing runs.
    expect(() => new Script(script)).not.toThrow();
    expect(script).toContain(`gtag("config","${GA_MEASUREMENT_ID}")`);
  });
});
