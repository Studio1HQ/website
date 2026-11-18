import { describe, expect, it } from "vitest";
import {
  fromInternalPath,
  isDashboardHost,
  isLocalPath,
  toInternalPath,
} from "./host";

describe("isDashboardHost", () => {
  it("knows the live and the local dashboard hosts, with or without a port", () => {
    expect(isDashboardHost("dashboard.studio1hq.com")).toBe(true);
    expect(isDashboardHost("DASHBOARD.studio1hq.com")).toBe(true);
    expect(isDashboardHost("dashboard.localhost:3000")).toBe(true);
    expect(isDashboardHost("dashboard.localhost")).toBe(true);
  });

  it("is false for the public site and look-alikes", () => {
    expect(isDashboardHost("www.studio1hq.com")).toBe(false);
    expect(isDashboardHost("studio1hq.com")).toBe(false);
    expect(isDashboardHost("localhost:3000")).toBe(false);
    expect(isDashboardHost("dashboard.studio1hq.com.evil.com")).toBe(false);
    expect(isDashboardHost("evildashboard.studio1hq.com")).toBe(false);
    expect(isDashboardHost(null)).toBe(false);
  });
});

describe("toInternalPath", () => {
  it("maps dashboard addresses to their app/internal routes", () => {
    expect(toInternalPath("/")).toBe("/internal");
    expect(toInternalPath("/?denied=1")).toBe("/internal?denied=1");
    expect(toInternalPath("/tasks")).toBe("/internal/tasks");
    expect(toInternalPath("/tasks/reports/abc?x=1")).toBe(
      "/internal/tasks/reports/abc?x=1",
    );
  });

  it("leaves paths that already have the prefix alone", () => {
    expect(toInternalPath("/internal")).toBe("/internal");
    expect(toInternalPath("/internal/tasks")).toBe("/internal/tasks");
  });

  it("does not mistake a route that starts with the same letters", () => {
    expect(toInternalPath("/internals")).toBe("/internal/internals");
  });
});

describe("fromInternalPath", () => {
  it("drops the prefix from old links", () => {
    expect(fromInternalPath("/internal")).toBe("/");
    expect(fromInternalPath("/internal/tasks")).toBe("/tasks");
    expect(fromInternalPath("/internal?denied=1")).toBe("/?denied=1");
    expect(fromInternalPath("/internal/people?tab=directory")).toBe(
      "/people?tab=directory",
    );
  });

  it("leaves dashboard addresses alone", () => {
    expect(fromInternalPath("/tasks")).toBe("/tasks");
    expect(fromInternalPath("/")).toBe("/");
    expect(fromInternalPath("/internals")).toBe("/internals");
  });

  it("round-trips", () => {
    for (const path of [
      "/",
      "/tasks",
      "/?x=1",
      "/clients/acme?week=2026-11-16",
    ]) {
      expect(fromInternalPath(toInternalPath(path))).toBe(path);
    }
  });
});

describe("isLocalPath", () => {
  it("accepts paths on this site only", () => {
    expect(isLocalPath("/tasks")).toBe(true);
    expect(isLocalPath("/")).toBe(true);
    expect(isLocalPath("//evil.com")).toBe(false);
    expect(isLocalPath("/\\evil.com")).toBe(false);
    expect(isLocalPath("https://evil.com")).toBe(false);
    expect(isLocalPath("tasks")).toBe(false);
  });
});
