import { describe, expect, it } from "vitest";
import { imageType, isPrivateAddress, isPublicHost, pickIcons, siteHost } from "./logo-pick";

describe("siteHost", () => {
  it("reads the hostname without www.", () => {
    expect(siteHost("https://www.brightdata.com/pricing")).toBe("brightdata.com");
    expect(siteHost("http://acme.dev")).toBe("acme.dev");
  });
  it("is null without a web link", () => {
    expect(siteHost(null)).toBeNull();
    expect(siteHost("")).toBeNull();
    expect(siteHost("not a url")).toBeNull();
    expect(siteHost("ftp://acme.dev")).toBeNull();
  });
});

describe("isPublicHost", () => {
  it("allows public names", () => {
    expect(isPublicHost("brightdata.com")).toBe(true);
    expect(isPublicHost("cdn.acme.co.uk")).toBe(true);
  });
  it("refuses addresses and private names", () => {
    for (const host of [
      "localhost",
      "app.localhost",
      "127.0.0.1",
      "169.254.169.254",
      "[::1]",
      "printer.local",
      "db.internal",
      "intranet",
    ])
      expect(isPublicHost(host), host).toBe(false);
  });
});

describe("isPrivateAddress", () => {
  it("refuses loopback, private, link-local, CGNAT, multicast and mapped forms", () => {
    for (const address of [
      "127.0.0.1",
      "0.0.0.0",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "224.0.0.1",
      "255.255.255.255",
      "::",
      "::1",
      "[::1]",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1%en0",
      "ff02::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "64:ff9b::10.0.0.1",
      "::127.0.0.1",
      "not-an-ip",
    ])
      expect(isPrivateAddress(address), address).toBe(true);
  });
  it("allows public addresses", () => {
    for (const address of ["104.18.6.1", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700::6810:1", "::ffff:8.8.8.8"])
      expect(isPrivateAddress(address), address).toBe(false);
  });
});

describe("pickIcons", () => {
  const page = "https://acme.dev/en/";

  it("puts an SVG first, then large PNGs, then the touch icon, then the rest", () => {
    const html = `<html><head>
      <link rel="icon" href="/favicon-16.png" sizes="16x16">
      <link rel="apple-touch-icon" href="/apple.png">
      <link rel="mask-icon" href="/pin.svg" color="#000">
      <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
      <link rel="icon" href="/logo.svg" type="image/svg+xml">
    </head><body><link rel="icon" href="/late.png"></body></html>`;
    expect(pickIcons(html, page)).toEqual([
      "https://acme.dev/logo.svg",
      "https://acme.dev/icon-192.png",
      "https://acme.dev/apple.png",
      "https://acme.dev/favicon-16.png",
    ]);
  });

  it("resolves relative links against the page and <base>, and decodes entities", () => {
    expect(pickIcons(`<link rel='shortcut icon' href='img/fav.ico?v=1&amp;x=2'>`, page)).toEqual([
      "https://acme.dev/en/img/fav.ico?v=1&x=2",
    ]);
    expect(
      pickIcons(`<base href="https://cdn.acme.dev/assets/"><link rel=icon href=fav.png>`, page),
    ).toEqual(["https://cdn.acme.dev/assets/fav.png"]);
  });

  it("skips data URLs, other schemes and duplicates", () => {
    const html = `<link rel="icon" href="data:image/png;base64,AAAA">
      <link rel="icon" href="javascript:alert(1)">
      <link rel="icon" href="/a.png"><link rel="shortcut icon" href="/a.png">`;
    expect(pickIcons(html, page)).toEqual(["https://acme.dev/a.png"]);
  });

  it("is empty when the page declares no icon", () => {
    expect(pickIcons(`<link rel="stylesheet" href="/x.css">`, page)).toEqual([]);
  });
});

describe("imageType", () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);
  const text = (value: string) => new TextEncoder().encode(value);

  it("reads the type from the bytes", () => {
    expect(imageType(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("image/png");
    expect(imageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(imageType(bytes(0x00, 0x00, 0x01, 0x00))).toBe("image/x-icon");
    expect(imageType(text("GIF89a......"))).toBe("image/gif");
    expect(imageType(text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe("image/webp");
    expect(imageType(text(`<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>`))).toBe(
      "image/svg+xml",
    );
    expect(imageType(text(`<!-- logo --><svg viewBox="0 0 1 1"></svg>`))).toBe("image/svg+xml");
  });

  it("refuses HTML and other files", () => {
    expect(imageType(text("<!doctype html><html><svg></svg></html>"))).toBeNull();
    expect(imageType(text("{}"))).toBeNull();
    expect(imageType(new Uint8Array())).toBeNull();
  });
});
