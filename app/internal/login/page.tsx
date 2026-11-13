import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Logo from "@/components/ui/svgs/logo";
import { getStaff } from "@/lib/internal/session";
import { STAFF_DOMAIN, safeNext } from "@/lib/internal/token";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  expired: "That sign-in link has expired or isn't valid. Ask for a new one.",
  browser:
    "Open the sign-in link in the same browser you asked for it from, or ask for a new link here.",
  denied: `Only @${STAFF_DOMAIN} addresses and invited writers can sign in.`,
  "signed-out": "You're signed out.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getStaff()) redirect(next);
  const notice = typeof params.error === "string" ? NOTICES[params.error] : undefined;
  const signedOut = params["signed-out"] !== undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <Logo className="size-9" />
          <div>
            <p className="text-[17px] font-medium leading-tight">Studio1</p>
            <p className="text-sm text-[var(--i-muted)]">Internal dashboard</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] p-6 shadow-sm">
          <h1 className="text-xl font-medium">Sign in</h1>
          <p className="mb-5 mt-1.5 text-sm leading-relaxed text-[var(--i-muted)]">
            For the Studio1 team and invited writers. Enter your @{STAFF_DOMAIN}{" "}
            address, or the one you were invited with, and we&apos;ll email you a link.
          </p>
          {notice || signedOut ? (
            <p
              role="status"
              className="mb-4 rounded-md bg-[var(--i-sunken)] px-3 py-2 text-sm text-[var(--i-muted)]"
            >
              {notice ?? NOTICES["signed-out"]}
            </p>
          ) : null}
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
