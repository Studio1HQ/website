import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Hourglass, Prohibit, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Logo from "@/components/ui/svgs/logo";
import { buttonClass } from "@/components/internal/ui";
import { requestAccess } from "@/lib/internal/members";
import { getStaff, hasAccess, homeFor } from "@/lib/internal/session";
import { signOut } from "../(dashboard)/actions";

export const metadata: Metadata = { title: "Waiting for approval" };

/** Where signed-in people land until an admin approves them. */
export default async function PendingPage() {
  const staff = await getStaff();
  if (!staff) redirect("/internal/login");
  // Anyone with a way in goes to their own start page.
  if (hasAccess(staff)) redirect(homeFor(staff));
  // Make sure an admin can see the request (signing in usually filed it).
  if (staff.status === "pending") await requestAccess(staff.email);

  const content =
    staff.status === "disabled"
      ? {
          icon: <Prohibit size={20} />,
          title: "Your access is turned off",
          body: "Ask Arindam or Amitesh if you need the dashboard again.",
        }
      : staff.status === "uninvited"
        ? {
            icon: <Prohibit size={20} />,
            title: "You don't have access",
            body: "This address hasn't been invited, or its invite was withdrawn. Ask the Studio1 person you write for to invite you.",
          }
      : staff.status === "unknown"
        ? {
            icon: <WarningCircle size={20} />,
            title: "We couldn't check your access",
            body: "Try again in a minute. If it keeps happening, tell Arindam or Amitesh.",
          }
        : {
            icon: <Hourglass size={20} />,
            title: "Waiting for approval",
            body: "Your request to join the Studio1 dashboard is with Arindam and Amitesh. You'll get in as soon as one of them approves it.",
          };

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
        <div className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] p-6 shadow-[var(--i-shadow-sm)]">
          <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-[var(--i-line)] bg-[var(--i-sunken)] text-[var(--i-muted)]">
            {content.icon}
          </div>
          <h1 className="text-[18px] font-medium">{content.title}</h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--i-muted)]">{content.body}</p>
          <p className="mt-4 text-[12.5px] text-[var(--i-faint)]">Signed in as {staff.email}</p>
          <div className="mt-5 flex gap-2">
            <Link href="/internal" className={buttonClass("primary")}>
              Check again
            </Link>
            <form action={signOut}>
              <button type="submit" className={buttonClass("secondary")}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
