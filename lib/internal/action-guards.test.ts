import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Server actions are public endpoints: anyone can call one by id, signed in
 * or not, whatever the page shows. So every exported action in the
 * dashboard has to check the session itself before it does anything.
 *
 * This reads each "use server" file under app/internal and fails when an
 * exported function has no guard call in its body. It can't tell whether
 * the guard is the right one for what the action changes (review that by
 * hand); it catches the one that was forgotten.
 */

const ROOT = join(process.cwd(), "app", "internal");

/** The session guards (lib/internal/session.ts), and data helpers that call one themselves. */
const BASE = ["require[A-Z]\\w*", "getStaff", "updateEntries", "exportRows"];

/**
 * A file's own helpers that wrap a guard ("async function manager() {
 * const staff = await requireMember(); … }"): calling one counts too.
 */
function localGuards(source: string) {
  const base = new RegExp(`\\b(${BASE.join("|")})\\s*\\(`);
  const names: string[] = [];
  for (const match of source.matchAll(/^(?:async )?function (\w+)\([^]*?\n}\n/gm)) {
    if (base.test(match[0])) names.push(match[1]);
  }
  return names;
}

function guardFor(source: string) {
  return new RegExp(`\\b(${[...BASE, ...localGuards(source)].join("|")})\\s*\\(`);
}

/** Before sign-in there's nobody to check: these take a code, a rate limit or a signed cookie instead. */
const NO_SESSION = new Set(["app/internal/login/actions.ts"]);

/** Actions that need no check, each with the reason. Keep this short. */
const EXEMPT = new Set([
  // Clears the caller's own cookie; there's nothing to protect.
  "app/internal/(dashboard)/actions.ts: signOut",
]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

function actions(source: string) {
  const parts = source.split(/^export async function /m).slice(1);
  // Up to the function's own closing brace, so a helper further down the
  // file can't lend it a guard.
  return parts.map((part) => ({ name: part.match(/^\w+/)?.[0] ?? "?", body: part.split(/\n}\n/)[0] }));
}

describe("dashboard server actions", () => {
  const found = files(ROOT)
    .map((path) => ({ path: path.slice(process.cwd().length + 1), source: readFileSync(path, "utf8") }))
    .filter((file) => /^["']use server["'];?/m.test(file.source.slice(0, 200)) && !NO_SESSION.has(file.path));

  it("finds the action files", () => {
    expect(found.length).toBeGreaterThan(10);
  });

  it("each checks who's asking", () => {
    const unguarded = found.flatMap((file) =>
      actions(file.source)
        .filter((action) => !guardFor(file.source).test(action.body))
        .map((action) => `${file.path}: ${action.name}`)
        .filter((name) => !EXEMPT.has(name)),
    );
    expect(unguarded).toEqual([]);
  });
});
