import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Logo from "@/components/ui/svgs/logo";
import { getStaff } from "@/lib/internal/session";
import { PENDING_COOKIE, STAFF_DOMAIN, emailAddress, safeNext } from "@/lib/internal/token";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  // Old sign-in links (before codes) still land here.
  expired: "Sign-in now uses a code instead of a link. Enter your email to get one.",
  "signed-out": "You're signed out.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getStaff()) redirect(next);
  const pendingEmail = emailAddress((await cookies()).get(PENDING_COOKIE)?.value);
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
            address, or the one you were invited with, and we&apos;ll email you a code.
          </p>
          {notice || signedOut ? (
            <p
              role="status"
              className="mb-4 rounded-md bg-[var(--i-sunken)] px-3 py-2 text-sm text-[var(--i-muted)]"
            >
              {notice ?? NOTICES["signed-out"]}
            </p>
          ) : null}
          <LoginForm next={next} pendingEmail={pendingEmail} />
        </div>
      </div>
    </main>
  );
}
