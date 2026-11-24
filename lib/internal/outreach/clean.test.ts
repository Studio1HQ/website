import { describe, expect, it } from "vitest";
import { cleanFields } from "@/lib/internal/outreach/clean";
import { CONTACT_FIELDS, ORG_FIELDS } from "@/lib/internal/outreach/schema";

describe("cleanFields", () => {
  it("needs the required fields when adding", () => {
    expect(cleanFields(ORG_FIELDS, { website: "acme.dev" }, "create")).toEqual({
      ok: false,
      message: "Name is needed.",
    });
  });

  // The edit form sends only what was changed, so a field that isn't there
  // must be left alone, never written as empty.
  it("writes only the fields an edit sent", () => {
    expect(cleanFields(ORG_FIELDS, { next_step: " Send  the proposal " }, "update")).toEqual({
      ok: true,
      row: { next_step: "Send the proposal" },
    });
    expect(cleanFields(CONTACT_FIELDS, { is_primary: true }, "update")).toEqual({
      ok: true,
      row: { is_primary: true },
    });
    expect(cleanFields(ORG_FIELDS, {}, "update")).toEqual({ ok: true, row: {} });
  });

  it("still refuses to blank a required field in an edit", () => {
    expect(cleanFields(ORG_FIELDS, { name: " " }, "update")).toEqual({
      ok: false,
      message: "Name is needed.",
    });
  });

  it("clears a field sent as empty", () => {
    expect(cleanFields(ORG_FIELDS, { follow_up_on: "", lost_reason: "" }, "update")).toEqual({
      ok: true,
      row: { follow_up_on: null, lost_reason: "" },
    });
  });
});
