import { beforeAll, describe, expect, it } from "vitest";
import { unsubscribeHeaders, unsubscribeUrl, verifyUnsubscribe } from "@/lib/unsubscribe";

beforeAll(() => {
  process.env.INTERNAL_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
});

async function linkFor(email: string) {
  const url = await unsubscribeUrl(email);
  if (!url) throw new Error("no link");
  const params = new URL(url).searchParams;
  return { url, e: params.get("e") ?? "", t: params.get("t") ?? "" };
}

describe("unsubscribe links", () => {
  it("signs an address and verifies it, whatever its case", async () => {
    const link = await linkFor("Priya@Example.com");
    expect(link.e).toBe("priya@example.com");
    expect(link.t).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await verifyUnsubscribe(link.e, link.t)).toBe("priya@example.com");
    expect(await verifyUnsubscribe("PRIYA@example.com ", link.t)).toBe("priya@example.com");
  });

  it("gives the same link every time, so old emails keep working", async () => {
    expect((await linkFor("priya@example.com")).url).toBe((await linkFor("priya@example.com")).url);
  });

  it("refuses a token for another address, a changed token and junk", async () => {
    const link = await linkFor("priya@example.com");
    expect(await verifyUnsubscribe("amit@example.com", link.t)).toBeNull();
    const flipped = (link.t[0] === "A" ? "B" : "A") + link.t.slice(1);
    expect(await verifyUnsubscribe(link.e, flipped)).toBeNull();
    expect(await verifyUnsubscribe(link.e, link.t.slice(0, 31))).toBeNull();
    expect(await verifyUnsubscribe(link.e, "")).toBeNull();
    expect(await verifyUnsubscribe(undefined, link.t)).toBeNull();
    expect(await verifyUnsubscribe("not-an-address", link.t)).toBeNull();
  });

  it("signs with a different key than another secret would", async () => {
    const first = (await linkFor("priya@example.com")).t;
    process.env.INTERNAL_AUTH_SECRET = "another-secret-that-is-at-least-32-characters";
    const second = (await linkFor("priya@example.com")).t;
    process.env.INTERNAL_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    expect(second).not.toBe(first);
  });

  it("points the one-click header at the POST route", async () => {
    const link = await linkFor("priya@example.com");
    const headers = unsubscribeHeaders(link.url);
    expect(headers["List-Unsubscribe"]).toBe(`<${link.url.replace("/unsubscribe?", "/unsubscribe/one-click?")}>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(unsubscribeHeaders(null)).toEqual({});
  });
});
