import { describe, expect, it } from "vitest";
import { isEmailAddress, mailtoHref } from "@/lib/form-checks";

describe("isEmailAddress", () => {
  it("takes ordinary addresses, in any case", () => {
    for (const email of ["priya@example.com", "Priya.Sharma+jobs@Mail.Example.co.in", "a_b-c@x.io", "p@example.com"]) {
      expect(isEmailAddress(email), email).toBe(true);
    }
  });

  it("refuses anything that could carry more than an address", () => {
    for (const email of [
      "priya@example.com?subject=Hi&body=Pay",
      "Priya<priya@example.com>",
      "\"priya\"@example.com",
      "priya@example.com,amit@example.com",
      "priya@example.com amit@example.com",
      "priya@@example.com",
      "priya@example",
      "priya..sharma@example.com",
      ".priya@example.com",
      "priya@-example.com",
      "priya@example.c",
      "@example.com",
      "priya@",
      "",
      `${"a".repeat(250)}@example.com`,
    ]) {
      expect(isEmailAddress(email), email).toBe(false);
    }
  });
});

describe("mailtoHref", () => {
  it("keeps the @ and encodes the rest", () => {
    expect(mailtoHref("priya@example.com")).toBe("mailto:priya@example.com");
    expect(mailtoHref("priya+jobs@example.com")).toBe("mailto:priya%2Bjobs@example.com");
  });

  it("can't be given a subject or more recipients by the address", () => {
    expect(mailtoHref("a@b.co?subject=Hi&body=x")).toBe("mailto:a@b.co%3Fsubject%3DHi%26body%3Dx");
    expect(mailtoHref("a@b.co,c@d.co")).toBe("mailto:a@b.co%2Cc@d.co");
  });

  it("adds the composer's own subject and body", () => {
    expect(mailtoHref("a@b.co", "?subject=Hi")).toBe("mailto:a@b.co?subject=Hi");
  });
});
