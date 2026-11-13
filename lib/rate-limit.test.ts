import { describe, expect, it } from "vitest";
import { clientIp, limitKey, normaliseAddress } from "@/lib/rate-limit";

describe("rate limit keys", () => {
  it("counts one inbox once, whatever the case or +tag", () => {
    expect(normaliseAddress("  Priya+Jobs@Example.COM ")).toBe("priya@example.com");
    expect(normaliseAddress("priya+a+b@example.com")).toBe("priya@example.com");
    expect(normaliseAddress("priya@example.com")).toBe("priya@example.com");
  });

  it("ignores the dots Gmail ignores, and only there", () => {
    expect(normaliseAddress("p.r.i.y.a+x@gmail.com")).toBe("priya@gmail.com");
    expect(normaliseAddress("p.riya@googlemail.com")).toBe("priya@gmail.com");
    expect(normaliseAddress("p.riya@example.com")).toBe("p.riya@example.com");
  });

  it("leaves something that isn't an address alone", () => {
    expect(normaliseAddress("not an address")).toBe("not an address");
    expect(normaliseAddress("@example.com")).toBe("@example.com");
  });

  it("stores a hash, the same for the same input and never the input itself", () => {
    const key = limitKey("address", "priya@example.com");
    expect(key).toMatch(/^[0-9a-f]{40}$/);
    expect(key).toBe(limitKey("address", "priya@example.com"));
    expect(key).not.toBe(limitKey("confirmation", "priya@example.com"));
    expect(key).not.toBe(limitKey("address", "priya@example.org"));
    expect(key).not.toContain("priya");
  });

  it("reads the visitor's IP from the host's headers", () => {
    const request = (headers: Record<string, string>) => new Request("https://example.com", { headers });
    expect(clientIp(request({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(clientIp(request({}))).toBeNull();
  });
});
