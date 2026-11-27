import { describe, expect, it } from "vitest";
import {
  supportLabels,
  validateCampusApplication,
} from "@/lib/campus-application";

const BASE = {
  name: "Asha Rao",
  email: "Asha@Example.com",
  communityName: "Node.js Kolkata",
  college: "",
  communityUrl: "linkedin.com/company/nodejs-kolkata",
  coreTeamSize: "8",
  eventTurnout: "50–150",
  support: ["swag", "speaker"],
  cashAsk: "",
  whyStudio1: "A monthly meetup; we'd love a hands-on AI agents workshop.",
  contactConsent: true,
  emailUpdates: true,
};

describe("campus application", () => {
  it("accepts a valid application and cleans it", () => {
    const result = validateCampusApplication(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.email).toBe("asha@example.com");
    expect(result.values.communityUrl).toBe(
      "https://linkedin.com/company/nodejs-kolkata",
    );
    // In the form's order, whatever order they arrived in.
    expect(result.values.support).toEqual(["speaker", "swag"]);
  });

  it("leaves what would help and the college optional", () => {
    expect(
      validateCampusApplication({ ...BASE, support: [], college: "" }).ok,
    ).toBe(true);
  });

  it("drops support keys it doesn't know", () => {
    const result = validateCampusApplication({
      ...BASE,
      support: ["swag", "yacht", 3],
    });
    expect(result.ok && result.values.support).toEqual(["swag"]);
  });

  it("asks about a funding request, and drops that answer when funding isn't picked", () => {
    const missing = validateCampusApplication({ ...BASE, support: ["cash"] });
    expect(!missing.ok && missing.errors.cashAsk).toBeTruthy();

    const given = validateCampusApplication({
      ...BASE,
      support: ["cash"],
      cashAsk: "About ₹40,000 for the venue.",
    });
    expect(given.ok).toBe(true);

    const notCash = validateCampusApplication({
      ...BASE,
      cashAsk: "left over from an earlier pick",
    });
    expect(notCash.ok && notCash.values.cashAsk).toBe("");
  });

  it("refuses a link in the community's name but allows names like Node.js", () => {
    const result = validateCampusApplication({
      ...BASE,
      communityName: "https://example.com",
    });
    expect(!result.ok && result.errors.communityName).toBeTruthy();
  });

  it("wants the committee size as a number", () => {
    for (const coreTeamSize of ["", "0", "ten", "2.5", "5000"]) {
      const result = validateCampusApplication({ ...BASE, coreTeamSize });
      expect(!result.ok && result.errors.coreTeamSize).toBeTruthy();
    }
  });

  it("wants the turnout as one of the ranges", () => {
    const result = validateCampusApplication({
      ...BASE,
      eventTurnout: "a lot",
    });
    expect(!result.ok && result.errors.eventTurnout).toBeTruthy();
  });

  it("needs a line about their plans", () => {
    const result = validateCampusApplication({ ...BASE, whyStudio1: "hi" });
    expect(!result.ok && result.errors.whyStudio1).toBeTruthy();
  });

  it("needs both consent ticks", () => {
    const result = validateCampusApplication({
      ...BASE,
      contactConsent: false,
      emailUpdates: false,
    });
    expect(!result.ok && result.errors.contactConsent).toBeTruthy();
    expect(!result.ok && result.errors.emailUpdates).toBeTruthy();
  });

  it("labels stored keys in the form's order", () => {
    expect(supportLabels(["cash", "swag"])).toEqual([
      "Swag",
      "Financial support",
    ]);
  });
});
